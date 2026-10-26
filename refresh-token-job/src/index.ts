import * as dotenv from 'dotenv';
dotenv.config();

import { readConfiguration } from 'tiktok-shared/dist/config';
import { logger } from 'tiktok-shared/dist/logger';
import app from './app';

readConfiguration();

const PORT = process.env.PORT || 8080;

const server = app.listen(PORT, () => {
  logger.info(`Job application listening on port ${PORT}`);
});

server.on('error', (error: Error & { code?: string }) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} is already in use`);
  } else {
    logger.error(`Server failed to start: ${error.message}`);
  }
  process.exit(1);
});

export default server;
