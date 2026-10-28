import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** Express 4 does not catch rejected promises; forward them to the error middleware. */
export const asyncHandler =
  (
    handler: (request: Request, response: Response, next: NextFunction) => Promise<unknown>,
  ): RequestHandler =>
  (request, response, next) => {
    handler(request, response, next).catch(next);
  };
