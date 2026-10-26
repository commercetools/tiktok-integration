import dotenv from 'dotenv';
dotenv.config();

import { createApiRoot } from 'tiktok-shared/dist/commercetools/client';
import { deleteSubscription } from './actions';

async function run(): Promise<void> {
  try {
    const deleted = await deleteSubscription(createApiRoot());
    process.stdout.write(
      deleted ? 'Subscription deleted\n' : 'No subscription to delete\n',
    );
  } catch (error) {
    process.stderr.write(
      `Pre-undeploy failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  }
}

run();
