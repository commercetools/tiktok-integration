import { createSessionAuthVerifier } from '@commercetools-backend/express';
import type { NextFunction, Request, Response } from 'express';
import { readConfiguration } from '../config';
import { McAuthError } from '../errors';
import { logger } from '../logger';

type AudiencePolicy = 'forward-url-full-path' | 'forward-url-origin';

/** The request shape the library verifier reads and annotates with `session`. */
interface VerifiableRequest {
  headers: Record<string, string>;
  url: string;
  session?: { userId?: string; projectKey: string };
}

export interface McVerifierOptions {
  /** A cloud identifier (e.g. `gcp-us`) or an issuer URL (tests). Null: every call is refused. */
  issuer: string | null;
  /** CONNECT_SERVICE_URL. Only its origin is used as the audience. Null: every call is refused. */
  serviceUrl: URL | null;
  /** CTP_PROJECT_KEY: a token for another project is refused. */
  projectKey: string;
}

export interface McPrincipal {
  userId?: string;
  projectKey: string;
  audiencePolicy: AudiencePolicy;
}

export type McVerifier = (
  headers: Record<string, string>,
  path: string,
) => Promise<McPrincipal>;

const POLICIES: readonly AudiencePolicy[] = [
  'forward-url-full-path',
  'forward-url-origin',
];

/**
 * Verifies the exchange token Merchant Center's `/proxy/forward-to` sends (signature, issuer,
 * audience, expiry) and that it belongs to this deployment's project. There is no permission
 * or role check: any user who can open the custom application is trusted. The full-path
 * audience policy (origin + forwarded path, which keeps the `/service` prefix on Connect) is
 * tried first, the origin policy is accepted as a fallback.
 *
 * `headers` must be lower-case; `path` is the request path including the endpoint prefix.
 */
export const createMcVerifier = ({
  issuer,
  serviceUrl,
  projectKey,
}: McVerifierOptions): McVerifier => {
  if (!issuer || !serviceUrl) {
    return async () => {
      throw new McAuthError(
        'unconfigured',
        'Merchant Center authentication is not configured (CLOUD_IDENTIFIER and CONNECT_SERVICE_URL)',
      );
    };
  }
  const verifiers = POLICIES.map(
    (policy) =>
      [
        policy,
        createSessionAuthVerifier<VerifiableRequest>({
          audience: serviceUrl.origin,
          issuer,
          audiencePolicy: policy,
          getRequestUrl: (request) => request.url,
        }),
      ] as const,
  );

  return async (headers, path) => {
    for (const [audiencePolicy, verifyWith] of verifiers) {
      const request: VerifiableRequest = { headers, url: path };
      try {
        await verifyWith(request);
      } catch {
        continue;
      }
      const { session } = request;
      if (!session) {
        continue;
      }
      if (session.projectKey !== projectKey) {
        throw new McAuthError(
          'other-project',
          'The Merchant Center token is for another project',
        );
      }
      return {
        projectKey: session.projectKey,
        audiencePolicy,
        ...(session.userId ? { userId: session.userId } : {}),
      };
    }
    throw new McAuthError('invalid', 'The Merchant Center token did not verify');
  };
};

/** Verifier built from the validated configuration (CLOUD_IDENTIFIER, CONNECT_SERVICE_URL, CTP_PROJECT_KEY). */
export const createMcVerifierFromConfiguration = (): McVerifier => {
  const config = readConfiguration();
  return createMcVerifier({
    issuer: config.cloudIdentifier,
    serviceUrl: config.connectServiceUrl ?? null,
    projectKey: config.ctp.projectKey,
  });
};

const lowerCaseHeaders = (request: Request): Record<string, string> =>
  Object.fromEntries(
    Object.entries(request.headers).flatMap(([name, value]) =>
      typeof value === 'string' ? [[name.toLowerCase(), value]] : [],
    ),
  );

/**
 * Express middleware: 401 for a missing/invalid/unconfigured session, 403 for another
 * project's token. Attach per route prefix (`/service/mc`, `/service/tiktok`), never per route.
 */
export const createMcAuthMiddleware =
  (verify: McVerifier) =>
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      await verify(lowerCaseHeaders(request), request.originalUrl);
      next();
    } catch (error) {
      if (error instanceof McAuthError) {
        logger.warn(`Merchant Center request refused: ${error.reason}`);
        response
          .status(error.reason === 'other-project' ? 403 : 401)
          .json({ message: 'Unauthorized' });
        return;
      }
      next(error);
    }
  };
