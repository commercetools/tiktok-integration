import type { ErrorRequestHandler } from 'express';
import {
  NotAuthorizedError,
  StoreNotFoundError,
  TikTokApiError,
} from '../../../shared/errors';
import { logger } from '../../../shared/logger';
import { MappingConfigError } from '../../../shared/mappings';
import { HttpError } from '../errors/http-error';

const isDevelopment = (): boolean => process.env.NODE_ENV === 'development';

/**
 * Last error handler. Messages that are written for the caller (HttpError, the connector's
 * own precondition errors) are returned as they are; everything else is generic in production
 * and never carries a stack.
 */
export const errorMiddleware: ErrorRequestHandler = (error, _request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }
  if (error instanceof HttpError) {
    response
      .status(error.statusCode)
      .json({ message: error.message, ...(error.issues ? { issues: error.issues } : {}) });
    return;
  }
  if (error instanceof MappingConfigError) {
    response.status(400).json({
      message: [error.message, ...error.issues].join('; '),
      issues: error.issues,
    });
    return;
  }
  if (error instanceof NotAuthorizedError || error instanceof StoreNotFoundError) {
    response.status(400).json({ message: error.message });
    return;
  }

  logger.error('Request failed', { error: error instanceof Error ? error.message : String(error) });
  if (error instanceof TikTokApiError) {
    response.status(502).json({
      message: isDevelopment() ? error.message : 'The TikTok Shop API request failed',
    });
    return;
  }
  response.status(500).json({
    message: isDevelopment() && error instanceof Error ? error.message : 'Internal server error',
  });
};
