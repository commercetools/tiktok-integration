import express, { Express, NextFunction, Request, Response } from 'express';
import { logger } from 'tiktok-shared/dist/src/logger';
import { post } from './controllers/job.controller';

const app: Express = express();
app.disable('x-powered-by');

app.post('/refresh-token-job', (req: Request, res: Response, next: NextFunction) => {
  post(req, res).catch(next);
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: 'Path not found.' });
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error in the refresh token job', { error });
  res.status(500).json({ message: 'Internal server error' });
});

export default app;
