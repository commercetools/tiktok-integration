import * as dotenv from 'dotenv';
dotenv.config();

import { logger } from '../../../shared/logger';

/**
 * Nothing is deleted on undeploy: the Store keeps the shop identity, mapping and (encrypted)
 * tokens so a redeploy with the same ENCRYPTION_KEY resumes without a new authorization, and
 * the connector created no commercetools resources of its own besides what Terraform manages.
 */
logger.info(
  'Undeploying. Store fields are kept. Remove the webhook URL in TikTok Partner Center if the connector is not coming back.',
);
