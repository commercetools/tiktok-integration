import { CLOUD_IDENTIFIERS } from '@commercetools-backend/express';
import { ConfigurationError } from './errors';
import { parseEncryptionKey } from './crypto';

export interface Configuration {
  ctp: {
    region: string;
    projectKey: string;
    clientId: string;
    clientSecret: string;
    /** Space-separated scopes as provided by Connect; empty when unset. */
    scopes: string[];
  };
  /** A commercetools cloud identifier (e.g. `gcp-us`) or, in tests only, an issuer URL. */
  cloudIdentifier: string;
  tiktok: {
    appKey: string;
    appSecret: string;
    authorizationLink?: string;
  };
  /** 32 raw bytes decoded from ENCRYPTION_KEY. */
  encryptionKey: Buffer;
  /** CONNECT_SERVICE_URL, provided by Connect to the service application only. */
  connectServiceUrl?: URL;
}

type Env = Record<string, string | undefined>;

const REQUIRED = [
  'CTP_REGION',
  'CTP_PROJECT_KEY',
  'CTP_CLIENT_ID',
  'CTP_CLIENT_SECRET',
  'CLOUD_IDENTIFIER',
  'TIKTOK_APP_KEY',
  'TIKTOK_APP_SECRET',
  'ENCRYPTION_KEY',
] as const;

const cloudIdentifiers: readonly string[] = Object.values(CLOUD_IDENTIFIERS);

const isHttpUrl = (value: string): boolean => {
  try {
    const { protocol } = new URL(value);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
};

const parseConfiguration = (env: Env): Configuration => {
  const problems = REQUIRED.filter((key) => !env[key]?.trim()).map(
    (key) => `${key} is required`,
  );

  const cloudIdentifier = env.CLOUD_IDENTIFIER?.trim() ?? '';
  if (
    cloudIdentifier &&
    !cloudIdentifiers.includes(cloudIdentifier) &&
    !isHttpUrl(cloudIdentifier)
  ) {
    problems.push(
      `CLOUD_IDENTIFIER must be one of ${cloudIdentifiers.join(', ')}`,
    );
  }

  let encryptionKey: Buffer = Buffer.alloc(0);
  if (env.ENCRYPTION_KEY?.trim()) {
    try {
      encryptionKey = parseEncryptionKey(env.ENCRYPTION_KEY.trim());
    } catch {
      problems.push('ENCRYPTION_KEY must be 32 bytes, base64-encoded');
    }
  }

  let connectServiceUrl: URL | undefined;
  if (env.CONNECT_SERVICE_URL?.trim()) {
    if (isHttpUrl(env.CONNECT_SERVICE_URL.trim())) {
      connectServiceUrl = new URL(env.CONNECT_SERVICE_URL.trim());
    } else {
      problems.push('CONNECT_SERVICE_URL is not an http(s) URL');
    }
  }

  if (problems.length > 0) {
    throw new ConfigurationError(problems);
  }

  return {
    ctp: {
      region: env.CTP_REGION as string,
      projectKey: env.CTP_PROJECT_KEY as string,
      clientId: env.CTP_CLIENT_ID as string,
      clientSecret: env.CTP_CLIENT_SECRET as string,
      scopes: (env.CTP_SCOPE ?? '').split(/\s+/).filter(Boolean),
    },
    cloudIdentifier,
    tiktok: {
      appKey: env.TIKTOK_APP_KEY as string,
      appSecret: env.TIKTOK_APP_SECRET as string,
      ...(env.TIKTOK_APP_AUTHORIZATION_LINK?.trim()
        ? { authorizationLink: env.TIKTOK_APP_AUTHORIZATION_LINK.trim() }
        : {}),
    },
    encryptionKey,
    ...(connectServiceUrl ? { connectServiceUrl } : {}),
  };
};

let cached: Configuration | undefined;

/**
 * Reads and validates the environment once and throws a `ConfigurationError` naming every bad
 * key. Called without arguments the result is cached for the process; with an explicit `env`
 * (tests) it is parsed fresh and not cached.
 */
export const readConfiguration = (env?: Env): Configuration => {
  if (env) {
    return parseConfiguration(env);
  }
  cached ??= parseConfiguration(process.env);
  return cached;
};
