import { ClientBuilder } from '@commercetools/sdk-client-v2';
import { authMiddlewareOptions } from '../middleware/auth.middleware';
import { httpMiddlewareOptions } from '../middleware/http.middleware';
import { Config } from '../../interfaces';

/**
 * Create a new client builder.
 * This code creates a new Client that can be used to make API calls
 */
export const createClient = (config: Config) =>
  new ClientBuilder()
    .withProjectKey(config.projectKey)
    .withClientCredentialsFlow(authMiddlewareOptions(config))
    .withHttpMiddleware(httpMiddlewareOptions(config))
    .build();
