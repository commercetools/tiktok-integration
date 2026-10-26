import * as dotenv from 'dotenv';
dotenv.config();

import { createApiRoot } from 'tiktok-shared/dist/commercetools/client';
import { readConfiguration } from 'tiktok-shared/dist/config';
import { logger } from 'tiktok-shared/dist/logger';
import { isAuthorized } from 'tiktok-shared/dist/state';
import { getTikTokClient } from 'tiktok-shared/dist/tiktok/client';
import { registerWebhooks, webhookAddress } from '../authorization/webhook-registration';

/**
 * Safe to run on every deploy and redeploy: it only validates the configuration, proves the
 * commercetools credentials work, and, when the shop is already authorized, points the TikTok
 * webhooks at this deployment's URL (which changes when the connector is recreated).
 * The Store may not exist yet: Terraform runs after the first deploy.
 */
const postDeploy = async (): Promise<void> => {
  readConfiguration();
  await createApiRoot().stores().get({ queryArgs: { limit: 1 } }).execute();
  logger.info('commercetools credentials verified');

  const address = webhookAddress();
  if (!address) {
    logger.warn('CONNECT_SERVICE_URL is not set; register the webhook URL in TikTok Partner Center');
    return;
  }
  logger.info(`TikTok webhook URL: ${address}`);

  if (await isAuthorized()) {
    const registration = await registerWebhooks(await getTikTokClient());
    if (registration.problem) {
      logger.warn(registration.problem);
    }
  }
};

postDeploy().catch((error: unknown) => {
  process.stderr.write(
    `Post-deploy failed: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
