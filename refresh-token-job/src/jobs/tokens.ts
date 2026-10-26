import { logger } from '../../../shared/logger';
import { readState, saveTokens } from '../../../shared/state';
import type { TikTokState } from '../../../shared/state';
import { refreshAccessToken } from '../../../shared/tiktok/auth';

const HOUR = 3600;
const DAY = 24 * HOUR;

/** The access token is renewed when it expires within a day, long before requests would need it. */
export const REFRESH_WINDOW_SECONDS = DAY;
/** The job warns once the seller authorization (refresh token) lapses within this window. */
export const REAUTHORIZATION_WARNING_SECONDS = 30 * DAY;

export type AuthorizationStatus =
  | 'not-authorized'
  | 'deauthorized'
  | 'expired'
  | 'expiring'
  | 'authorized';

export const authorizationStatus = (
  state: TikTokState | undefined,
  nowSeconds: number,
): AuthorizationStatus => {
  if (!state?.tiktokRefreshToken) {
    return state?.tiktokDeauthorizedAt !== undefined ? 'deauthorized' : 'not-authorized';
  }
  if (
    state.tiktokDeauthorizedAt !== undefined &&
    state.tiktokDeauthorizedAt >= (state.tiktokAuthorizedAt ?? 0)
  ) {
    return 'deauthorized';
  }
  const expiresAt = state.tiktokRefreshExpiresAt;
  if (expiresAt === undefined) {
    return 'authorized';
  }
  if (expiresAt <= nowSeconds) {
    return 'expired';
  }
  return expiresAt - nowSeconds <= REAUTHORIZATION_WARNING_SECONDS ? 'expiring' : 'authorized';
};

export type RefreshOutcome = 'refreshed' | 'still-valid' | 'skipped';

const accessTokenIsFresh = (state: TikTokState | undefined, nowSeconds: number): boolean =>
  !!state?.tiktokAccessToken &&
  (state.tiktokAccessExpiresAt ?? 0) - nowSeconds > REFRESH_WINDOW_SECONDS;

/**
 * Renews the access token when it expires within 24 hours, unlike the lazy 5-minute refresh
 * the apps do on demand. Another instance may rotate the refresh token first; the stored
 * state is then re-read and accepted when it already holds a fresh token.
 */
export const refreshTokensIfExpiring = async (
  nowSeconds: number,
): Promise<RefreshOutcome> => {
  const state = await readState({ fresh: true });
  if (!state?.tiktokRefreshToken || authorizationStatus(state, nowSeconds) === 'expired') {
    return 'skipped';
  }
  if (accessTokenIsFresh(state, nowSeconds)) {
    return 'still-valid';
  }
  try {
    await saveTokens(await refreshAccessToken(state.tiktokRefreshToken));
    return 'refreshed';
  } catch (error) {
    const latest = await readState({ fresh: true });
    if (accessTokenIsFresh(latest, nowSeconds)) {
      logger.info('Another instance already refreshed the TikTok access token');
      return 'still-valid';
    }
    throw error;
  }
};
