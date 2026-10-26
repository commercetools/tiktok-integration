import { generateKeyPairSync } from 'node:crypto';
import request from 'supertest';
import { startIssuer, type LocalIssuer } from '../../../shared/test/support/mc';
import { applyTestEnv } from '../test/support';

jest.mock('tiktok-shared/dist/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('tiktok-shared/dist/state');
jest.mock('tiktok-shared/dist/tiktok/client');

import { verifyAuthState } from 'tiktok-shared/dist/auth/state';
import { isAuthorized, readState, writeState } from 'tiktok-shared/dist/state';
import { getTikTokClient } from 'tiktok-shared/dist/tiktok/client';
import { createApp } from '../app';

const ORIGIN = 'https://svc.example';

describe('Merchant Center routes', () => {
  let mc: LocalIssuer;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    mc = await startIssuer();
    applyTestEnv({ CLOUD_IDENTIFIER: mc.issuer });
    app = createApp();
  });
  afterAll(() => mc.close());

  beforeEach(() => {
    jest.mocked(readState).mockResolvedValue(undefined);
    jest.mocked(isAuthorized).mockResolvedValue(false);
    jest.mocked(writeState).mockResolvedValue(undefined);
  });

  const statusPath = '/service/mc/connection-status';
  const wrongKey = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;

  describe('session verification', () => {
    it.each([
      ['full-path audience', `${ORIGIN}${statusPath}`],
      ['origin audience', ORIGIN],
    ])('accepts a valid token with the %s', async (_name, aud) => {
      const response = await request(app).get(statusPath).set(mc.headers({ aud }));

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ connected: false, warehouses: [], storeFound: false });
    });

    it.each<[string, () => Record<string, string>]>([
      ['no token', () => ({})],
      ['an expired token', () => mc.headers({ aud: ORIGIN, expSeconds: -120 })],
      ['a token for another audience', () => mc.headers({ aud: 'https://evil.example' })],
      ['a token from another issuer', () => mc.headers({ aud: ORIGIN, iss: 'https://evil.example' })],
      ['a token signed with another key', () => mc.headers({ aud: ORIGIN, key: wrongKey })],
      ['an unsigned alg:none token', () => mc.unsignedHeaders(ORIGIN)],
    ])('answers 401 to %s', async (_name, headers) => {
      const response = await request(app).get(statusPath).set(headers());

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: 'Unauthorized' });
    });

    it('answers 403 to a token of another project', async () => {
      const response = await request(app)
        .get(statusPath)
        .set(mc.headers({ aud: ORIGIN, projectKey: 'another-project' }));

      expect(response.status).toBe(403);
    });

    it('protects the TikTok metadata routes too, including with a query string', async () => {
      jest.mocked(getTikTokClient).mockResolvedValue({
        categories: { list: jest.fn().mockResolvedValue([{ id: '1', localName: 'Home', isLeaf: true }]) },
      } as unknown as Awaited<ReturnType<typeof getTikTokClient>>);

      const refused = await request(app).get('/service/tiktok/categories');
      const accepted = await request(app)
        .get('/service/tiktok/categories?locale=en')
        .set(mc.headers({ aud: ORIGIN }));

      expect(refused.status).toBe(401);
      expect(accepted.status).toBe(200);
      expect(accepted.body).toEqual({ categories: [{ id: '1', localName: 'Home', isLeaf: true }] });
    });

    it('leaves the health route open', async () => {
      const response = await request(app).get('/service/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('responses', () => {
    const authed = () => mc.headers({ aud: ORIGIN });

    it('issues an authorization link with a state the callback accepts', async () => {
      const response = await request(app).get('/service/mc/authorization-link').set(authed());

      const url = new URL(response.body.url);
      expect(response.status).toBe(200);
      expect(url.searchParams.get('app_key')).toBe('abcdef');
      expect(verifyAuthState(url.searchParams.get('state') ?? undefined)).toBe(true);
    });

    it('reports a connected shop without exposing tokens', async () => {
      const now = Math.floor(Date.now() / 1000);
      jest.mocked(readState).mockResolvedValue({
        tiktokShopId: '749',
        tiktokShopName: 'My Shop',
        tiktokRegion: 'US',
        tiktokAccessToken: 'secret-access',
        tiktokRefreshToken: 'secret-refresh',
        tiktokAccessExpiresAt: now + 3600,
        tiktokRefreshExpiresAt: now + 86400,
        tiktokAuthorizedAt: now - 10,
        tiktokWarehouses: JSON.stringify([{ id: 'w1', entityId: 'e1', name: 'Main', type: 'SALES_WAREHOUSE' }]),
      });
      jest.mocked(isAuthorized).mockResolvedValue(true);
      jest.mocked(getTikTokClient).mockResolvedValue({
        events: { getWebhooks: jest.fn().mockResolvedValue([]) },
      } as unknown as Awaited<ReturnType<typeof getTikTokClient>>);

      const response = await request(app).get(statusPath).set(authed());

      expect(response.body).toMatchObject({
        connected: true,
        shop: { id: '749', name: 'My Shop', region: 'US' },
        warehouses: [{ id: 'w1', name: 'Main', type: 'SALES_WAREHOUSE' }],
        accessTokenExpiresAt: now + 3600,
        storeFound: true,
        serviceConfigured: true,
      });
      expect(JSON.stringify(response.body)).not.toContain('secret-');
    });

    it('rejects an invalid mapping config with the issues', async () => {
      const response = await request(app)
        .put('/service/mc/mappings')
        .set(authed())
        .send({ productTypes: { pt1: { categoryId: '' } } });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Mapping config is invalid; ');
      expect(response.body.issues.length).toBeGreaterThan(0);
      expect(writeState).not.toHaveBeenCalled();
    });

    it('saves and returns a valid mapping config', async () => {
      const response = await request(app)
        .put('/service/mc/mappings')
        .set(authed())
        .send({ productTypes: {} });

      expect(response.status).toBe(200);
      expect(writeState).toHaveBeenCalledTimes(1);
    });

    it('requires product ids for a selective sync', async () => {
      const response = await request(app)
        .post('/service/mc/selective-product-sync')
        .set(authed())
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('productIds');
    });

    it('answers a failure with a generic message and no stack', async () => {
      jest.mocked(readState).mockRejectedValue(new Error('database password is hunter2'));

      const response = await request(app).get(statusPath).set(authed());

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ message: 'Internal server error' });
    });

    it('answers 404 for unknown paths', async () => {
      const response = await request(app).get('/service/nothing');

      expect(response.status).toBe(404);
    });
  });
});
