import dotenv from 'dotenv';
dotenv.config();

import { CommercetoolsClient, Utils } from '../shared';
import { assertError } from '../utils/assert.utils';
import { deleteCustomerCreateSubscription } from './actions';

async function preUndeploy(): Promise<void> {
  const apiRoot = CommercetoolsClient.createApiRoot(Utils.readConfiguration());
  await deleteCustomerCreateSubscription(apiRoot);
}

async function run(): Promise<void> {
  try {
    await preUndeploy();
  } catch (error) {
    assertError(error);
    process.stderr.write(`Post-undeploy failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

run();
