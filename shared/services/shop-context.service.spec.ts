import type { ByProjectKeyRequestBuilder } from '@commercetools/platform-sdk';
import { readState } from '../state';
import { getCommercetoolsLocale } from './localization.service';
import { clearShopContextCache, getShopContext } from './shop-context.service';

jest.mock('../state', () => ({ readState: jest.fn() }));
const readStateMock = readState as jest.Mock;

const channel = (id: string, fields: Record<string, unknown>) => ({
  id,
  custom: { fields },
});

const buildApiRoot = (byPredicate: Record<string, unknown[]>) => {
  const get = jest.fn(({ queryArgs }: { queryArgs: { where: string } }) => ({
    execute: async () => ({
      body: { results: byPredicate[queryArgs.where] ?? [] },
    }),
  }));
  return {
    apiRoot: {
      channels: () => ({ get }),
    } as unknown as ByProjectKeyRequestBuilder,
    get,
  };
};

const WAREHOUSE = 'custom(fields(isTikTokWarehouse=true))';
const PRICE = 'custom(fields(isTikTokPrice=true))';

const state = {
  tiktokLocale: 'en',
  tiktokRegion: 'US',
  tiktokWarehouses: JSON.stringify([
    { id: 'wh-0', entityId: 'e0' },
    { id: 'wh-1', entityId: 'e1' },
  ]),
};

beforeEach(() => {
  jest.resetAllMocks();
  clearShopContextCache();
});

describe('getShopContext', () => {
  it('combines Store state with the warehouse and price channels', async () => {
    readStateMock.mockResolvedValue(state);
    const { apiRoot, get } = buildApiRoot({
      [WAREHOUSE]: [
        channel('supply', { isTikTokWarehouse: true, warehouseId: 'wh-1' }),
      ],
      [PRICE]: [channel('price', { isTikTokPrice: true })],
    });
    const context = await getShopContext(apiRoot);
    expect(context).toEqual({
      locale: 'en-US',
      shopRegion: 'US',
      ctSupplyChannelId: 'supply',
      ctDistributionChannelId: 'price',
      tiktokWarehouseId: 'wh-1',
      tiktokWarehouseEntityId: 'e1',
    });
    await getShopContext(apiRoot);
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('allows a missing price channel', async () => {
    readStateMock.mockResolvedValue(state);
    const { apiRoot } = buildApiRoot({
      [WAREHOUSE]: [channel('supply', { warehouseId: 'wh-1' })],
    });
    expect(
      (await getShopContext(apiRoot)).ctDistributionChannelId,
    ).toBeUndefined();
  });

  it.each([
    ['no state', undefined, {}, 'Shop configuration not found'],
    ['no warehouse channel', state, {}, 'No warehouse channel found'],
    [
      'several warehouse channels',
      state,
      {
        [WAREHOUSE]: [
          channel('a', { warehouseId: 'wh-1' }),
          channel('b', { warehouseId: 'wh-1' }),
        ],
      },
      'Multiple warehouse channels found',
    ],
    [
      'channel without warehouse id',
      state,
      { [WAREHOUSE]: [channel('a', {})] },
      'No warehouse ID found',
    ],
    [
      'unknown warehouse',
      state,
      { [WAREHOUSE]: [channel('a', { warehouseId: 'nope' })] },
      'No TikTok warehouse matches',
    ],
  ])('fails on %s', async (_name, stored, channels, message) => {
    readStateMock.mockResolvedValue(stored);
    const { apiRoot } = buildApiRoot(channels);
    await expect(getShopContext(apiRoot)).rejects.toThrow(message);
  });
});

describe('getCommercetoolsLocale', () => {
  it('normalizes supported short locales', async () => {
    readStateMock.mockResolvedValue({ tiktokLocale: 'en' });
    await expect(getCommercetoolsLocale()).resolves.toBe('en-US');
    readStateMock.mockResolvedValue({ tiktokLocale: 'de-DE' });
    await expect(getCommercetoolsLocale()).resolves.toBe('de-DE');
  });

  it('throws without a locale', async () => {
    readStateMock.mockResolvedValue({});
    await expect(getCommercetoolsLocale()).rejects.toThrow('No locale found');
  });
});
