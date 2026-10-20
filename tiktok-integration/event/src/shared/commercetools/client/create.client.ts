import { createClient } from './build.client';

import { createApiBuilderFromCtpClient } from '@commercetools/platform-sdk';

import { ByProjectKeyRequestBuilder } from '@commercetools/platform-sdk/dist/declarations/src/generated/client/by-project-key-request-builder';
import { Config } from '../../interfaces';

/**
 * Create client with apiRoot
 * apiRoot can now be used to build requests to de Composable Commerce API
 */
export const createApiRoot = (config: Config): ByProjectKeyRequestBuilder => {
  return createApiBuilderFromCtpClient(createClient(config)).withProjectKey({
    projectKey: config.projectKey,
  });
};
