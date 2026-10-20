import * as dotenv from 'dotenv';
dotenv.config();

import { logger } from './utils/logger.utils';

import app from './app';

const PORT = process.env.PORT || 8080;

// Listen the application
const server = app.listen(PORT, () => {
  logger.info(`⚡️ Event application listening on port ${PORT}`);
});

server.on('error', (error: any) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} is already in use`);
  } else {
    logger.error('Server failed to start: ' + error.message); 
  }
  process.exit(1);
});

export default server;
