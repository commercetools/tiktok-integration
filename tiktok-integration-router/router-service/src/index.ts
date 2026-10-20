import * as dotenv from 'dotenv';
dotenv.config();

// Import logger
import { logger } from './utils/logger.utils';

import app from './app';

const isDevelopment = process.env.NODE_ENV === 'development';
const PORT = isDevelopment ? 8090 : 8080;

// Listen the application
const server = app.listen(PORT, () => {
  logger.info(`⚡️ Router Service application listening on port ${PORT}`);
});

export default server;
