import { AppProjectMapping, TokenResponse } from '../interfaces';
import { logger } from '../utils/logger';

/**
 * Response type from router service authorize-project endpoint
 */
export interface AuthorizeProjectResponse {
  access_token_data: TokenResponse;
  app_map_data: AppProjectMapping;
  jwt_token: string;
  jwt_expires_at: number;
}

/**
 * Get router service URL from environment variable
 * @returns The router service URL
 */
const getRouterServiceUrl = (): string => {
  const url = process.env.ROUTER_SERVICE_URL_ENDPOINT;

  if (!url) {
    throw new Error(
      'ROUTER_SERVICE_URL_ENDPOINT environment variable is not set',
    );
  }

  return url;
};

/**
 * Refresh access token via router service
 * @param refresh_token - The refresh token
 * @returns The new token data
 */
export const refreshAccessToken = async (
  refresh_token: string,
): Promise<TokenResponse> => {
  const url = getRouterServiceUrl();

  logger.info('Refreshing access token via router service');

  const response = await fetch(
    `${url}/refresh-access-token?refresh_token=${encodeURIComponent(refresh_token)}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );

  if (!response.ok) {
    const error = await response.text();
    logger.error('Failed to refresh access token via router service', {
      error,
    });
    throw new Error(`Token refresh failed: ${error}`);
  }

  const data: TokenResponse = await response.json();
  logger.info('Access token refreshed successfully via router service');

  return data;
};

/**
 * Refresh JWT token using the existing JWT
 * @param currentJwtToken - The current JWT token (can be expired)
 * @returns The new JWT token data
 */
export const refreshJwtToken = async (
  currentJwtToken: string,
): Promise<{
  jwt_token: string;
  jwt_expires_at: number;
}> => {
  const url = getRouterServiceUrl();

  logger.info('Refreshing JWT token via router service');

  const response = await fetch(`${url}/refresh-jwt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${currentJwtToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error('Failed to refresh JWT token via router service', { error });
    throw new Error(`JWT token refresh failed: ${error}`);
  }

  const data: {
    jwt_token: string;
    jwt_expires_at: number;
  } = await response.json();

  logger.info('JWT token refreshed successfully via router service', {
    expiresAt: new Date(data.jwt_expires_at * 1000).toISOString(),
  });

  return {
    jwt_token: data.jwt_token,
    jwt_expires_at: data.jwt_expires_at,
  };
};
