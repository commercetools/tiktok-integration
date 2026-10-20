import { AccessTokenTool } from '../../tiktok-sdk';
import { BaseResponse, TokenResponse } from '../../tiktok-sdk/client/token';

export const getAccessToken = async (
  auth_code: string,
  app_key: string,
  app_secret: string,
): Promise<BaseResponse<TokenResponse>> => {
  console.log('getting access token', auth_code, app_key, app_secret);
  const { body } = await AccessTokenTool.getAccessToken(
    auth_code,
    app_key,
    app_secret,
  );

  const jsonBody = JSON.parse(body as string);
  const access_token = jsonBody.data?.access_token;
  if (!access_token) {
    throw new Error('Failed to get access token');
  }
  return jsonBody;
};

export const refreshAccessToken = async (
  refresh_token: string,
  app_key: string,
  app_secret: string,
): Promise<BaseResponse<TokenResponse>> => {
  const { body } = await AccessTokenTool.refreshToken(
    refresh_token,
    app_key,
    app_secret,
  );

  const jsonBody = JSON.parse(body as string);
  const access_token = jsonBody.data?.access_token;
  if (!access_token) {
    throw new Error('Failed to get access token');
  }
  return jsonBody;
};
