import { readState, writeState } from '../state';
import { TtlCache } from '../utils/ttl-cache';
import {
  emptyMappingConfig,
  mappingConfigSchema,
  type MappingConfig,
} from './schema';

/** Conservative ceiling for the `mappingConfig` Store custom field. */
export const MAX_MAPPING_CONFIG_LENGTH = 100_000;

const CACHE_TTL_MS = 30_000;
const CACHE_KEY = 'mappingConfig';

const cache = new TtlCache<MappingConfig>(CACHE_TTL_MS);

export class MappingConfigError extends Error {
  constructor(
    message: string,
    readonly issues: string[] = [],
  ) {
    super(message);
    this.name = 'MappingConfigError';
  }
}

/** Parses and validates the stored JSON; an unset field is an empty config. */
export const parseMappingConfig = (raw: unknown): MappingConfig => {
  if (raw === undefined || raw === null || raw === '') {
    return emptyMappingConfig();
  }
  let json: unknown = raw;
  if (typeof raw === 'string') {
    try {
      json = JSON.parse(raw);
    } catch {
      throw new MappingConfigError('Mapping config is not valid JSON');
    }
  }
  return validateMappingConfig(json);
};

export const validateMappingConfig = (input: unknown): MappingConfig => {
  const result = mappingConfigSchema.safeParse(input);
  if (!result.success) {
    throw new MappingConfigError(
      'Mapping config is invalid',
      result.error.issues.map(
        (issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`,
      ),
    );
  }
  return result.data;
};

export const loadMappingConfig = async (): Promise<MappingConfig> =>
  cache.getOrLoad(CACHE_KEY, async () => {
    const state = await readState();
    return parseMappingConfig(state?.mappingConfig);
  });

export const saveMappingConfig = async (
  input: unknown,
): Promise<MappingConfig> => {
  const config = validateMappingConfig(input);
  const serialized = JSON.stringify(config);
  if (serialized.length > MAX_MAPPING_CONFIG_LENGTH) {
    throw new MappingConfigError(
      `Mapping config exceeds ${MAX_MAPPING_CONFIG_LENGTH} characters`,
    );
  }
  await writeState({ mappingConfig: serialized });
  cache.set(CACHE_KEY, config);
  return config;
};

export const clearMappingConfigCache = (): void => cache.clear();
