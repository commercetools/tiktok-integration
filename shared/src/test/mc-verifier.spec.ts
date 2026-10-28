import { generateKeyPairSync } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { createMcAuthMiddleware, createMcVerifier, type McVerifier } from '../auth/mc-verifier';
import { McAuthError } from '../errors';
jest.mock('../logger', () => ({ logger: { warn: jest.fn() } }));

import { startIssuer, type LocalIssuer } from './support/mc';

const serviceUrl = new URL('https://svc.example/service');
const origin = serviceUrl.origin;
const path = '/service/mc/connection-status';

describe('MC session verifier', () => {
  let mc: LocalIssuer;
  let verify: McVerifier;

  beforeAll(async () => {
    mc = await startIssuer();
    verify = createMcVerifier({ issuer: mc.issuer, serviceUrl, projectKey: 'proj-x' });
  });
  afterAll(() => mc.close());

  const reason = async (promise: Promise<unknown>) =>
    promise.then(
      () => undefined,
      (error: McAuthError) => error.reason,
    );

  it('accepts the full-path audience policy', async () => {
    const principal = await verify(mc.headers({ aud: `${origin}${path}` }), path);
    expect(principal).toMatchObject({ projectKey: 'proj-x', userId: 'user-1', audiencePolicy: 'forward-url-full-path' });
  });

  it('accepts the origin audience policy', async () => {
    const principal = await verify(mc.headers({ aud: origin }), path);
    expect(principal.audiencePolicy).toBe('forward-url-origin');
  });

  it('refuses a token for another project with other-project', async () => {
    expect(await reason(verify(mc.headers({ aud: origin, projectKey: 'other' }), path))).toBe('other-project');
  });

  it('refuses missing, expired, wrong-audience, wrong-issuer, wrong-key and alg:none tokens', async () => {
    const wrongKey = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
    const cases: Record<string, string>[] = [
      {},
      mc.headers({ aud: origin, expSeconds: -120 }),
      mc.headers({ aud: 'https://evil.example' }),
      mc.headers({ aud: origin, iss: 'https://evil.example' }),
      mc.headers({ aud: origin, key: wrongKey }),
      mc.unsignedHeaders(origin),
    ];
    for (const headers of cases) {
      expect(await reason(verify(headers, path))).toBe('invalid');
    }
  });

  it('refuses everything when unconfigured', async () => {
    const unconfigured = createMcVerifier({ issuer: null, serviceUrl: null, projectKey: 'proj-x' });
    expect(await reason(unconfigured(mc.headers({ aud: origin }), path))).toBe('unconfigured');
  });

  describe('middleware', () => {
    const run = async (headers: Record<string, string>) => {
      const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      await createMcAuthMiddleware(verify)(
        { headers, originalUrl: path } as unknown as Request,
        response as unknown as Response,
        next as NextFunction,
      );
      return { response, next };
    };

    it('calls next for a valid session', async () => {
      const { next, response } = await run(mc.headers({ aud: origin }));
      expect(next).toHaveBeenCalledWith();
      expect(response.status).not.toHaveBeenCalled();
    });

    it('answers 401 for invalid and 403 for another project, with a generic body', async () => {
      const invalid = await run({});
      expect(invalid.response.status).toHaveBeenCalledWith(401);
      expect(invalid.response.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
      const other = await run(mc.headers({ aud: origin, projectKey: 'other' }));
      expect(other.response.status).toHaveBeenCalledWith(403);
      expect(other.next).not.toHaveBeenCalled();
    });
  });
});
