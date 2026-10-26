import * as dotenv from 'dotenv';
dotenv.config();

import { readConfiguration } from 'tiktok-shared/dist/config';
import { logger } from 'tiktok-shared/dist/logger';
import { createApp } from './app';

// Fail at startup, naming the offending keys, rather than on the first request.
readConfiguration();

const PORT = process.env.PORT || 8080;

const server = createApp().listen(PORT, () => {
  logger.info(`Service application listening on port ${PORT}`);
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
