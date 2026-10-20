import { type HttpMiddlewareOptions } from '@commercetools/sdk-client-v2'; // Required for sending HTTP requests
import { Config } from '../../interfaces';

/**
 * Configure Middleware. Example only. Adapt on your own
 */
export const httpMiddlewareOptions: (
  config: Config,
) => HttpMiddlewareOptions = (config: Config) => ({
  host: `https://api.${config.region}.commercetools.com`,
});
