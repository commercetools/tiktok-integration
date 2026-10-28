import { useMemo } from 'react';
import {
  buildApiUrl,
  executeHttpClientRequest,
} from '@commercetools-frontend/application-shell';
import { useApplicationContext } from '@commercetools-frontend/application-shell-connectors';
import createHttpUserAgent from '@commercetools/http-user-agent';
import {
  createServiceClient,
  type ServiceClient,
  type ServiceResponse,
  type ServiceTransport,
} from './service-client';

/** `additionalEnv` from custom-application-config.mjs. An empty value is dropped by the config loader. */
type ServiceEnvironment = {
  tiktokServiceUrl?: string;
};

const userAgent = createHttpUserAgent({
  name: 'tiktok-connect-mc-app',
  version: '1.0.0',
  libraryName: 'tiktok-connect',
});

const parseBody = (text: string): unknown => {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text.slice(0, 300) };
  }
};

/**
 * Sends requests to `${serviceUrl}/${path}` through the Merchant Center's
 * `/proxy/forward-to`. The proxy verifies the user's session and forwards a
 * signed exchange token, which the service verifies in turn.
 */
export const createForwardToTransport =
  (serviceUrl: string): ServiceTransport =>
  ({ method, path, body }) =>
    executeHttpClientRequest<ServiceResponse>(
      async (options: RequestInit) => {
        const response = await fetch(buildApiUrl('/proxy/forward-to'), {
          ...options,
          method,
          headers: {
            ...options.headers,
            ...(body === undefined
              ? {}
              : { 'Content-Type': 'application/json' }),
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
        return {
          data: {
            status: response.status,
            body: parseBody(await response.text()),
          },
          // A 401 makes the shell renew the session token and retry once.
          statusCode: response.status === 401 ? 401 : 200,
          getHeader: (name: string) => response.headers.get(name),
        };
      },
      {
        userAgent,
        forwardToConfig: {
          uri: `${serviceUrl}/${path}`,
          audiencePolicy: 'forward-url-full-path',
          includeUserPermissions: false,
        },
      }
    );

export const normalizeServiceUrl = (value: string | undefined) =>
  (value ?? '').trim().replace(/\/+$/, '');

type TikTokService =
  | { configured: false; url: ''; client?: undefined }
  | { configured: true; url: string; client: ServiceClient };

/**
 * The connector's service, when the deployment configures one
 * (`SERVICE_URL`, the service's base URL ending in /service).
 */
export const useTikTokService = (): TikTokService => {
  const env = useApplicationContext(
    (ctx) => ctx.environment as unknown as ServiceEnvironment
  );
  const url = normalizeServiceUrl(env?.tiktokServiceUrl);

  return useMemo(
    () =>
      url
        ? {
            configured: true,
            url,
            client: createServiceClient(createForwardToTransport(url)),
          }
        : { configured: false, url: '' },
    [url]
  );
};
