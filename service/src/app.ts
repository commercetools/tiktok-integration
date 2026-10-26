import express, { type Express } from 'express';
import { createMcAuthMiddleware, createMcVerifierFromConfiguration } from 'tiktok-shared/dist/auth/mc-verifier';
import { logger } from 'tiktok-shared/dist/logger';
import { type AuthorizationInput, type AuthorizationResult } from './authorization/complete-authorization';
import { HttpError } from './errors/http-error';
import { errorMiddleware } from './middleware/error.middleware';
import { createAuthRouter } from './routes/auth';
import { healthRouter } from './routes/health';
import { createMcRouter } from './routes/mc';
import { createTiktokRouter } from './routes/tiktok';
import { createWebhookRouter } from './routes/webhook';
import { createDefaultWebhookProcessor } from './webhook/default-processor';
import type { WebhookProcessor } from './webhook/processor';

export interface AppOptions {
  /** Replaces the real webhook handling (tests). */
  webhookProcessor?: WebhookProcessor;
  /** Replaces the real authorization flow (tests). */
  completeAuthorization?: (input: AuthorizationInput) => Promise<AuthorizationResult>;
}

/**
 * Everything is mounted under `/service`, the endpoint Connect routes to this application:
 * one router per caller, with the Merchant Center session check attached per prefix.
 */
export const createApp = (options: AppOptions = {}): Express => {
  const app = express();
  app.disable('x-powered-by');

  const requireMcSession = createMcAuthMiddleware(createMcVerifierFromConfiguration());
  const service = express.Router();
  service.use('/health', healthRouter);
  service.use('/webhook', createWebhookRouter(options.webhookProcessor ?? createDefaultWebhookProcessor()));
  service.use('/auth', createAuthRouter(options.completeAuthorization));
  service.use('/mc', requireMcSession, express.json({ limit: '1mb' }), createMcRouter());
  service.use('/tiktok', requireMcSession, createTiktokRouter());
  app.use('/service', service);

  app.use((request, _response, next) => {
    logger.info('Path not found', { path: request.path });
    next(new HttpError(404, 'Path not found'));
  });
  app.use(errorMiddleware);
  return app;
};
