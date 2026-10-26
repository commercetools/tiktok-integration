import request from 'supertest';
import { applyTestEnv } from '../test/support';

jest.mock('../../../shared/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

applyTestEnv();

import { issueAuthState } from '../../../shared/auth/state';
import { StoreNotFoundError, TikTokApiError } from '../../../shared/errors';
import { createApp } from '../app';

describe('GET /service/auth/callback', () => {
  const complete = jest.fn();
  const app = createApp({ webhookProcessor: jest.fn(), completeAuthorization: complete });

  beforeEach(() => {
    complete.mockReset().mockResolvedValue({
      shopId: '749',
      shopName: 'My Shop',
      webhooks: { registered: [], unchanged: [] },
    });
  });

  const callback = (query: Record<string, string>) =>
    request(app).get('/service/auth/callback').query(query);

  it('exchanges the code, passes TikTok’s locale and region, and renders a success page', async () => {
    const response = await callback({
      code: 'auth-code',
      state: issueAuthState(),
      locale: 'en',
      shop_region: 'US',
    });

    expect(response.status).toBe(200);
    expect(response.type).toBe('text/html');
    expect(response.text).toContain('TikTok Shop authorized');
    expect(response.text).toContain('My Shop');
    expect(complete).toHaveBeenCalledWith({ code: 'auth-code', locale: 'en', shopRegion: 'US' });
  });

  it('escapes the shop name and notes in the page', async () => {
    complete.mockResolvedValue({
      shopId: '1',
      shopName: '<script>alert(1)</script>',
      webhooks: { registered: [], unchanged: [], problem: '"><img src=x>' },
    });

    const response = await callback({ code: 'c', state: issueAuthState() });

    expect(response.text).not.toContain('<script>alert(1)</script>');
    expect(response.text).not.toContain('<img src=x>');
    expect(response.text).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('ignores a malformed locale', async () => {
    await callback({ code: 'c', state: issueAuthState(), locale: '<b>', shop_region: 'USA' });

    expect(complete).toHaveBeenCalledWith({ code: 'c' });
  });

  it.each([
    ['a missing state', { code: 'c' }],
    ['a forged state', { code: 'c', state: 'nonce.9999999999.forged' }],
    ['an expired state', { code: 'c', state: issueAuthState({ now: 1000 }) }],
  ])('refuses %s without using the code', async (_name, query) => {
    const response = await callback(query);

    expect(response.status).toBe(400);
    expect(response.text).toContain('invalid or has expired');
    expect(complete).not.toHaveBeenCalled();
  });

  it('refuses a callback without a code', async () => {
    const response = await callback({ state: issueAuthState() });

    expect(response.status).toBe(400);
    expect(complete).not.toHaveBeenCalled();
  });

  it('reports a denied authorization', async () => {
    const response = await callback({ error: 'access_denied', state: issueAuthState() });

    expect(response.status).toBe(400);
    expect(response.text).toContain('cancelled or denied');
  });

  it('shows a friendly page when TikTok rejects the code, without TikTok’s message', async () => {
    complete.mockRejectedValue(new TikTokApiError('internal detail 36004004', 36004004));

    const response = await callback({ code: 'used', state: issueAuthState() });

    expect(response.status).toBe(502);
    expect(response.text).toContain('Authorization failed');
    expect(response.text).not.toContain('36004004');
  });

  it('explains a missing Store', async () => {
    complete.mockRejectedValue(new StoreNotFoundError());

    const response = await callback({ code: 'c', state: issueAuthState() });

    expect(response.status).toBe(400);
    expect(response.text).toContain('isTikTokShop=true');
  });

  it('hides unexpected failures', async () => {
    complete.mockRejectedValue(new Error('connection string postgres://secret'));

    const response = await callback({ code: 'c', state: issueAuthState() });

    expect(response.status).toBe(500);
    expect(response.text).not.toContain('postgres://secret');
  });
});
