import * as dotenv from 'dotenv';
dotenv.config();

import { readConfiguration } from '../../shared/config';
import { logger } from '../../shared/logger';
import app from './app';

readConfiguration();

const PORT = process.env.PORT || 8080;

const server = app.listen(PORT, () => {
  logger.info(`Event application listening on port ${PORT}`);
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
