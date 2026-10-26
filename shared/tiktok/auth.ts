import { AccessTokenTool } from '../tiktok-sdk';
import type { BaseResponse, TokenResponse } from '../tiktok-sdk/client/token';
import { readConfiguration } from '../config';
import { TikTokApiError } from '../errors';

/** Tokens from the TikTok auth service; both expiries are Unix timestamps in seconds. */
export interface TikTokTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number;
  refreshTokenExpiresAt: number;
  openId?: string;
  sellerName?: string;
  sellerBaseRegion?: string;
}

type AuthResult = { body: BaseResponse<TokenResponse> | string };

const toTokens = ({ body }: AuthResult): TikTokTokens => {
  // The vendored SDK uses `request` without `json: true`, so the body is the raw JSON text.
  const parsed: BaseResponse<TokenResponse> =
    typeof body === 'string' ? JSON.parse(body) : body;
  const data = parsed.data;
  if (parsed.code !== 0 || !data?.access_token || !data.refresh_token) {
    throw new TikTokApiError(
      `TikTok token request failed: ${parsed.message ?? 'no token in response'}`,
      parsed.code,
      parsed.requestId,
    );
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    accessTokenExpiresAt: data.access_token_expire_in ?? 0,
    refreshTokenExpiresAt: data.refresh_token_expire_in ?? 0,
    ...(data.open_id ? { openId: data.open_id } : {}),
    ...(data.seller_name ? { sellerName: data.seller_name } : {}),
    ...(data.seller_base_region
      ? { sellerBaseRegion: data.seller_base_region }
      : {}),
  };
};

/** Exchanges the `code` from the authorization redirect for tokens. */
export const exchangeAuthCode = async (code: string): Promise<TikTokTokens> => {
  const { appKey, appSecret } = readConfiguration().tiktok;
  return toTokens(await AccessTokenTool.getAccessToken(code, appKey, appSecret));
};

/** Obtains a new access token (and refresh token) from a refresh token. */
export const refreshAccessToken = async (
  refreshToken: string,
): Promise<TikTokTokens> => {
  const { appKey, appSecret } = readConfiguration().tiktok;
  return toTokens(
    await AccessTokenTool.refreshToken(refreshToken, appKey, appSecret),
  );
};
