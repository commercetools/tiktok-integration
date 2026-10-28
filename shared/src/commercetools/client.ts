import { ClientBuilder } from '@commercetools/ts-client';
import {
  createApiBuilderFromCtpClient,
  type ByProjectKeyRequestBuilder,
} from '@commercetools/platform-sdk';
import { readConfiguration, type Configuration } from '../config';

const buildApiRoot = ({ ctp }: Configuration): ByProjectKeyRequestBuilder => {
  const client = new ClientBuilder()
    .withProjectKey(ctp.projectKey)
    .withClientCredentialsFlow({
      host: `https://auth.${ctp.region}.commercetools.com`,
      projectKey: ctp.projectKey,
      credentials: { clientId: ctp.clientId, clientSecret: ctp.clientSecret },
      ...(ctp.scopes.length > 0 ? { scopes: ctp.scopes } : {}),
      httpClient: fetch,
    })
    .withHttpMiddleware({
      host: `https://api.${ctp.region}.commercetools.com`,
      httpClient: fetch,
      enableRetry: true,
    })
    .build();

  return createApiBuilderFromCtpClient(client).withProjectKey({
    projectKey: ctp.projectKey,
  });
};

let cached: ByProjectKeyRequestBuilder | undefined;

/**
 * The project-scoped commercetools API root, built once per process from the validated
 * configuration. Pass a configuration to build an uncached root (tests).
 */
export const createApiRoot = (
  configuration?: Configuration,
): ByProjectKeyRequestBuilder => {
  if (configuration) {
    return buildApiRoot(configuration);
  }
  cached ??= buildApiRoot(readConfiguration());
  return cached;
};
