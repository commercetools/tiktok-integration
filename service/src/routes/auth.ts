import { Router, type Request } from 'express';
import { verifyAuthState } from 'tiktok-shared/dist/auth/state';
import { NotAuthorizedError, StoreNotFoundError, TikTokApiError } from 'tiktok-shared/dist/errors';
import { logger } from 'tiktok-shared/dist/logger';
import {
  completeAuthorization,
  type AuthorizationInput,
  type AuthorizationResult,
} from '../authorization/complete-authorization';
import { asyncHandler } from '../utils/async-handler';
import { renderErrorPage, renderSuccessPage } from '../utils/html';

const LOCALE_PATTERN = /^[A-Za-z]{2,3}([-_][A-Za-z0-9]{2,8})?$/;
const REGION_PATTERN = /^[A-Za-z]{2}$/;

const queryString = (request: Request, name: string): string | undefined => {
  const value = request.query[name];
  return typeof value === 'string' && value !== '' ? value : undefined;
};

const failureOf = (error: unknown): { status: number; message: string } => {
  if (error instanceof StoreNotFoundError || error instanceof NotAuthorizedError) {
    return { status: 400, message: error.message };
  }
  if (error instanceof TikTokApiError) {
    return {
      status: 502,
      message:
        'TikTok did not accept the authorization. The code may have expired or been used already: start again from the Merchant Center.',
    };
  }
  return { status: 500, message: 'The authorization could not be completed. See the service logs.' };
};

/**
 * `GET /service/auth/callback`: TikTok's redirect after the seller authorizes the app. The
 * `state` issued by `GET /service/mc/authorization-link` must verify before the code is used.
 * The browser gets an HTML page, never JSON.
 */
export const createAuthRouter = (
  complete: (input: AuthorizationInput) => Promise<AuthorizationResult> = completeAuthorization,
): Router => {
  const router = Router();

  router.get(
    '/callback',
    asyncHandler(async (request, response) => {
      response.type('html').set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'");
      const fail = (status: number, message: string) => {
        response.status(status).send(renderErrorPage(message, status));
      };

      if (queryString(request, 'error')) {
        fail(400, 'The authorization was cancelled or denied in TikTok.');
        return;
      }
      if (!verifyAuthState(queryString(request, 'state'))) {
        fail(400, 'The authorization link is invalid or has expired. Start again from the Merchant Center.');
        return;
      }
      const code = queryString(request, 'code');
      if (!code) {
        fail(400, 'TikTok did not send an authorization code.');
        return;
      }

      const locale = queryString(request, 'locale');
      const shopRegion = queryString(request, 'shop_region');
      try {
        const result = await complete({
          code,
          ...(locale && LOCALE_PATTERN.test(locale) ? { locale } : {}),
          ...(shopRegion && REGION_PATTERN.test(shopRegion) ? { shopRegion } : {}),
        });
        const notes = [
          ...(result.webhooks.problem ? [result.webhooks.problem] : []),
          ...(result.warehousesProblem ? [result.warehousesProblem] : []),
        ];
        response.status(200).send(renderSuccessPage(result.shopName, notes));
      } catch (error) {
        logger.error('Completing the TikTok authorization failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        const failure = failureOf(error);
        fail(failure.status, failure.message);
      }
    }),
  );

  return router;
};
