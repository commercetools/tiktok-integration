import dotenv from 'dotenv';
dotenv.config();

import { createApiRoot } from '../../../shared/commercetools/client';
import { destinationFromEnv, ensureSubscription } from './actions';

async function run(): Promise<void> {
  try {
    const outcome = await ensureSubscription(
      createApiRoot(),
      destinationFromEnv(process.env),
    );
    process.stdout.write(`Subscription ${outcome}\n`);
  } catch (error) {
    process.stderr.write(
      `Post-deploy failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  }
}

run();
