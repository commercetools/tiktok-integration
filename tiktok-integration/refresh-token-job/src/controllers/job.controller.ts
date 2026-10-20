import { Request, Response } from 'express';

import CustomError from '../errors/custom.error';
import { logger } from '../utils/logger.utils';
import {
  CommercetoolsClient,
  Utils,
  CommercetoolsStorage,
  RouterService,
} from '../shared';

/**
 * Exposed job endpoint.
 *
 * @param {Request} _request The express request
 * @param {Response} response The express response
 * @returns
 */
export const post = async (_request: Request, res: Response) => {
  try {
    const apiRoot = CommercetoolsClient.createApiRoot(
      Utils.readConfiguration(),
    );

    // Check if TikTok access token needs refresh
    const refreshToken =
      await CommercetoolsStorage.TokenController.getTokensNeedingRefresh(
        apiRoot,
      );

    logger.info('Checking tokens needing refresh', {
      tiktokTokenNeedsRefresh: !!refreshToken,
    });

    if (refreshToken) {
      const data = await RouterService.refreshAccessToken(refreshToken);
      if (data) {
        await CommercetoolsStorage.TokenController.updateRefreshedToken(
          apiRoot,
          data,
        );
        logger.info('TikTok access token refreshed successfully');
      }
    }

    // Check if JWT token needs refresh
    const jwtNeedsRefresh =
      await CommercetoolsStorage.TokenController.getJwtTokenNeedingRefresh(
        apiRoot,
      );

    logger.info('JWT token refresh check', {
      needsRefresh: jwtNeedsRefresh,
    });

    if (jwtNeedsRefresh) {
      try {
        // Get current JWT token (even if expired) for refresh
        const currentJwtToken =
          await CommercetoolsStorage.TokenController.getJwtTokenForRefresh(
            apiRoot,
          );

        if (!currentJwtToken) {
          logger.warn('No JWT token found to refresh');
        } else {
          const jwtData = await RouterService.refreshJwtToken(currentJwtToken);
          if (jwtData) {
            await CommercetoolsStorage.TokenController.storeJwtToken(
              apiRoot,
              jwtData.jwt_token,
              jwtData.jwt_expires_at,
            );
            logger.info('JWT token refreshed successfully');
          }
        }
      } catch (error) {
        logger.error('Failed to refresh JWT token', error);
        // Don't throw - continue execution even if JWT refresh fails
      }
    }

    res.status(200).send();
  } catch (error) {
    logger.error('Error in refresh token job', error);
    throw new CustomError(
      500,
      `Internal Server Error - Error refreshing tokens: ${(error as Error).message}`,
    );
  }
};
