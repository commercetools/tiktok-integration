import express, { Express, NextFunction, Request, Response } from 'express';
import { logger } from '../../shared/logger';
import { post } from './controllers/event.controller';

const isBodyParseError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { type?: string }).type === 'entity.parse.failed';

const app: Express = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

app.post('/event', (req: Request, res: Response, next: NextFunction) => {
  post(req, res).catch(next);
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: 'Path not found.' });
});

// A body that is not JSON never becomes valid on redelivery: acknowledge it and drop it.
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (isBodyParseError(error)) {
    logger.warn('Dropping an event request whose body is not valid JSON');
    res.status(200).send();
    return;
  }
  logger.error('Unhandled error in the event application', { error });
  res.status(500).json({ message: 'Internal server error' });
});

export default app;
