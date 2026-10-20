import { type AuthMiddlewareOptions } from '@commercetools/sdk-client-v2'; // Required for auth
import { Config } from '../../interfaces';

/**
 * Configure Middleware. Example only. Adapt on your own
 */
export const authMiddlewareOptions: (
  config: Config,
) => AuthMiddlewareOptions = (config: Config) => ({
  host: `https://auth.${config.region}.commercetools.com`,
  projectKey: config.projectKey,
  credentials: {
    clientId: config.clientId,
    clientSecret: config.clientSecret,
  },
  scopes: config.scope ? [config.scope as string] : undefined,
});
