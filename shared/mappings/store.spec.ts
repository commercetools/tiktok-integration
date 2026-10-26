import { readState, writeState } from '../state';
import {
  clearMappingConfigCache,
  loadMappingConfig,
  MappingConfigError,
  MAX_MAPPING_CONFIG_LENGTH,
  parseMappingConfig,
  saveMappingConfig,
} from './store';

jest.mock('../state', () => ({
  readState: jest.fn(),
  writeState: jest.fn(),
}));

const readStateMock = readState as jest.Mock;
const writeStateMock = writeState as jest.Mock;

const valid = {
  version: 1,
  productTypes: {
    pt1: {
      categoryId: '2268304',
      productAttributes: [],
      skuAttributes: [{ tiktokAttributeId: '100000', ctAttribute: 'color' }],
    },
  },
};

beforeEach(() => {
  jest.resetAllMocks();
  clearMappingConfigCache();
});

describe('parseMappingConfig', () => {
  it('treats an unset field as an empty config', () => {
    expect(parseMappingConfig(undefined)).toEqual({
      version: 1,
      productTypes: {},
    });
    expect(parseMappingConfig('')).toEqual({ version: 1, productTypes: {} });
  });

  it('rejects invalid JSON and invalid shapes with readable issues', () => {
    expect(() => parseMappingConfig('{nope')).toThrow(MappingConfigError);
    try {
      parseMappingConfig(
        JSON.stringify({ version: 1, productTypes: { a: {} } }),
      );
      throw new Error('expected failure');
    } catch (error) {
      expect(error).toBeInstanceOf(MappingConfigError);
      expect((error as MappingConfigError).issues.join()).toContain(
        'productTypes.a.categoryId',
      );
    }
  });

  it('refuses legacy base64 function mappers', () => {
    const legacy = {
      pt1: [
        {
          name: 'Color',
          tiktokAttributeId: '1',
          valueNameFetcher: Buffer.from('() => 1').toString('base64'),
        },
      ],
    };
    expect(() => parseMappingConfig(JSON.stringify(legacy))).toThrow(
      MappingConfigError,
    );
  });
});

describe('loadMappingConfig', () => {
  it('reads from state and caches the result', async () => {
    readStateMock.mockResolvedValue({ mappingConfig: JSON.stringify(valid) });
    const first = await loadMappingConfig();
    const second = await loadMappingConfig();
    expect(first.productTypes.pt1.categoryId).toBe('2268304');
    expect(second).toBe(first);
    expect(readStateMock).toHaveBeenCalledTimes(1);
  });

  it('defaults to empty when there is no state yet', async () => {
    readStateMock.mockResolvedValue(undefined);
    await expect(loadMappingConfig()).resolves.toEqual({
      version: 1,
      productTypes: {},
    });
  });
});

describe('saveMappingConfig', () => {
  it('validates, writes the JSON string and refreshes the cache', async () => {
    writeStateMock.mockResolvedValue(undefined);
    const saved = await saveMappingConfig(valid);
    expect(writeStateMock).toHaveBeenCalledWith({
      mappingConfig: JSON.stringify(saved),
    });
    await expect(loadMappingConfig()).resolves.toBe(saved);
    expect(readStateMock).not.toHaveBeenCalled();
  });

  it('does not write invalid configs', async () => {
    await expect(saveMappingConfig({ version: 2 })).rejects.toThrow(
      MappingConfigError,
    );
    expect(writeStateMock).not.toHaveBeenCalled();
  });

  it('rejects configs larger than the field budget', async () => {
    const big = {
      version: 1,
      productTypes: {
        pt: {
          categoryId: 'c',
          productAttributes: [],
          skuAttributes: [
            {
              tiktokAttributeId: '1',
              ctAttribute: 'a',
              valueMap: Object.fromEntries(
                Array.from(
                  { length: MAX_MAPPING_CONFIG_LENGTH / 10 },
                  (_, i) => [`key-${i}`, { name: `value-${i}` }],
                ),
              ),
            },
          ],
        },
      },
    };
    await expect(saveMappingConfig(big)).rejects.toThrow('exceeds');
    expect(writeStateMock).not.toHaveBeenCalled();
  });
});
