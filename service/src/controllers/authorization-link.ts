import { issueAuthState } from 'tiktok-shared/dist/auth/state';
import { readConfiguration } from 'tiktok-shared/dist/config';
import { HttpError } from '../errors/http-error';

/** Seller authorization endpoint used when TIKTOK_APP_AUTHORIZATION_LINK is not configured. */
const DEFAULT_AUTHORIZATION_URL = 'https://auth.tiktok-shops.com/oauth/authorize';

/**
 * The link the seller opens to authorize the app, carrying a signed, short-lived `state` that
 * `GET /service/auth/callback` verifies. TikTok echoes `state` back on the redirect.
 */
export const buildAuthorizationLink = (): { url: string } => {
  const { tiktok } = readConfiguration();
  let url: URL;
  try {
    url = new URL(tiktok.authorizationLink ?? DEFAULT_AUTHORIZATION_URL);
  } catch {
    throw new HttpError(500, 'TIKTOK_APP_AUTHORIZATION_LINK is not a valid URL');
  }
  if (!tiktok.authorizationLink) {
    url.searchParams.set('app_key', tiktok.appKey);
  }
  url.searchParams.set('state', issueAuthState());
  return { url: url.toString() };
};
