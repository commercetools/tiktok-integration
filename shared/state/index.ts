import type {
  ByProjectKeyRequestBuilder,
  Store,
  StoreSetCustomFieldAction,
} from '@commercetools/platform-sdk';
import { createApiRoot } from '../commercetools/client';
import { readConfiguration } from '../config';
import { decrypt, encrypt } from '../crypto';
import { CryptoError, NotAuthorizedError, StoreNotFoundError } from '../errors';
import { logger } from '../logger';
import { refreshAccessToken, type TikTokTokens } from '../tiktok/auth';
import {
  NUMBER_FIELDS,
  SECRET_FIELDS,
  STRING_FIELDS,
  type StatePatch,
  type TikTokState,
} from './types';

export type { StatePatch, TikTokState } from './types';

const MAX_WRITE_ATTEMPTS = 5;
const REFRESH_SKEW_SECONDS = 5 * 60;
const READ_CACHE_MS = 5_000;

const nowSeconds = (): number => Math.floor(Date.now() / 1000);

const isConflict = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  ((error as { statusCode?: number }).statusCode === 409 ||
    (error as { code?: number }).code === 409);

/** The Store flagged `isTikTokShop=true`; throws `StoreNotFoundError` when there is none. */
export const getTikTokStore = async (
  apiRoot: ByProjectKeyRequestBuilder = createApiRoot(),
): Promise<Store> => {
  const { body } = await apiRoot
    .stores()
    .get({ queryArgs: { where: 'custom(fields(isTikTokShop=true))', limit: 2 } })
    .execute();
  const [store, other] = body.results;
  if (!store) {
    throw new StoreNotFoundError();
  }
  if (other) {
    logger.warn(
      'More than one store has isTikTokShop=true; using the first. One deployment serves one shop.',
    );
  }
  return store;
};

const decodeState = (store: Store): TikTokState => {
  const fields: Record<string, unknown> = store.custom?.fields ?? {};
  const state: TikTokState = {};
  for (const name of STRING_FIELDS) {
    const value = fields[name];
    if (typeof value === 'string' && value !== '') {
      state[name] = value;
    }
  }
  for (const name of NUMBER_FIELDS) {
    const value = fields[name];
    if (typeof value === 'number') {
      state[name] = value;
    }
  }
  const { encryptionKey } = readConfiguration();
  for (const name of SECRET_FIELDS) {
    const value = fields[name];
    if (typeof value === 'string' && value !== '') {
      try {
        state[name] = decrypt(value, encryptionKey);
      } catch (error) {
        if (!(error instanceof CryptoError)) {
          throw error;
        }
        logger.warn(
          `Stored ${name} cannot be decrypted (ENCRYPTION_KEY changed?); re-authorize the shop`,
        );
      }
    }
  }
  return state;
};

const toActions = (patch: StatePatch): StoreSetCustomFieldAction[] => {
  const { encryptionKey } = readConfiguration();
  const secret: ReadonlySet<string> = new Set(SECRET_FIELDS);
  return Object.entries(patch)
    .filter(([, value]) => value !== undefined)
    .map(([name, value]) => ({
      action: 'setCustomField' as const,
      name,
      ...(value === null
        ? {}
        : {
            value: secret.has(name)
              ? encrypt(String(value), encryptionKey)
              : value,
          }),
    }));
};

let cache: { state: TikTokState; expires: number } | undefined;

/** Current connector state, or `undefined` when no Store carries the shop flag yet. */
export const readState = async (options?: {
  fresh?: boolean;
}): Promise<TikTokState | undefined> => {
  if (!options?.fresh && cache && cache.expires > Date.now()) {
    return cache.state;
  }
  let store: Store;
  try {
    store = await getTikTokStore();
  } catch (error) {
    if (error instanceof StoreNotFoundError) {
      return undefined;
    }
    throw error;
  }
  const state = decodeState(store);
  cache = { state, expires: Date.now() + READ_CACHE_MS };
  return state;
};

/**
 * Applies the patch with `setCustomField` actions, re-reading the Store version and retrying
 * on a 409 (concurrent modification). Setting a field again is idempotent, so retries are safe.
 * Clearing a field the Store does not have is skipped: commercetools rejects that action.
 */
export const writeState = async (patch: StatePatch): Promise<void> => {
  const actions = toActions(patch);
  if (actions.length === 0) {
    return;
  }
  const apiRoot = createApiRoot();
  cache = undefined;
  for (let attempt = 1; ; attempt += 1) {
    const store = await getTikTokStore(apiRoot);
    const present: Record<string, unknown> = store.custom?.fields ?? {};
    const applicable = actions.filter(
      (action) => action.value !== undefined || present[action.name] !== undefined,
    );
    if (applicable.length === 0) {
      return;
    }
    try {
      await apiRoot
        .stores()
        .withId({ ID: store.id })
        .post({ body: { version: store.version, actions: applicable } })
        .execute();
      return;
    } catch (error) {
      if (!isConflict(error) || attempt >= MAX_WRITE_ATTEMPTS) {
        throw error;
      }
    }
  }
};

/** Persists tokens from an authorization or a refresh. */
export const saveTokens = async (
  tokens: TikTokTokens,
  options?: { authorized?: boolean },
): Promise<void> =>
  writeState({
    tiktokAccessToken: tokens.accessToken,
    tiktokRefreshToken: tokens.refreshToken,
    tiktokAccessExpiresAt: tokens.accessTokenExpiresAt,
    tiktokRefreshExpiresAt: tokens.refreshTokenExpiresAt,
    ...(options?.authorized
      ? { tiktokAuthorizedAt: nowSeconds(), tiktokDeauthorizedAt: null }
      : {}),
  });

const hasLiveAuthorization = (state: TikTokState | undefined): boolean => {
  if (!state?.tiktokAccessToken || !state.tiktokRefreshToken) {
    return false;
  }
  const { tiktokDeauthorizedAt, tiktokAuthorizedAt, tiktokRefreshExpiresAt } = state;
  if (
    tiktokDeauthorizedAt !== undefined &&
    tiktokDeauthorizedAt >= (tiktokAuthorizedAt ?? 0)
  ) {
    return false;
  }
  return tiktokRefreshExpiresAt === undefined || tiktokRefreshExpiresAt > nowSeconds();
};

/** True when tokens exist, the shop was not deauthorized since, and the refresh token is alive. */
export const isAuthorized = async (): Promise<boolean> =>
  hasLiveAuthorization(await readState());

/**
 * Removes the tokens and records the deauthorization time. Shop facts (id, cipher, name,
 * region) stay for display until the next authorization overwrites them.
 */
export const clearAuthorization = async (): Promise<void> =>
  writeState({
    tiktokAccessToken: null,
    tiktokRefreshToken: null,
    tiktokAccessExpiresAt: null,
    tiktokRefreshExpiresAt: null,
    tiktokAuthorizedAt: null,
    tiktokDeauthorizedAt: nowSeconds(),
  });

const isFresh = (state: TikTokState | undefined): state is TikTokState & {
  tiktokAccessToken: string;
} =>
  !!state?.tiktokAccessToken &&
  (state.tiktokAccessExpiresAt ?? 0) - nowSeconds() > REFRESH_SKEW_SECONDS;

let refreshing: Promise<string> | undefined;

const refresh = async (state: TikTokState | undefined): Promise<string> => {
  if (!state?.tiktokRefreshToken || !hasLiveAuthorization(state)) {
    throw new NotAuthorizedError();
  }
  try {
    const tokens = await refreshAccessToken(state.tiktokRefreshToken);
    await saveTokens(tokens);
    return tokens.accessToken;
  } catch (error) {
    // Another instance may have refreshed first (refresh tokens can be single-use).
    const latest = await readState({ fresh: true });
    if (isFresh(latest)) {
      return latest.tiktokAccessToken;
    }
    throw error;
  }
};

/** A usable access token, refreshing it (and persisting the new pair) when it expires in < 5 min. */
export const getValidAccessToken = async (): Promise<string> => {
  const state = await readState();
  if (isFresh(state) && hasLiveAuthorization(state)) {
    return state.tiktokAccessToken;
  }
  refreshing ??= refresh(state).finally(() => {
    refreshing = undefined;
  });
  return refreshing;
};
