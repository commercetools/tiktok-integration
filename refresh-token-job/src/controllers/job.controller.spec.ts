import request from 'supertest';
import { readState } from 'tiktok-shared/dist/state';
import { reconcileOrders } from '../jobs/reconcile-orders';
import { refreshTokensIfExpiring } from '../jobs/tokens';
import app from '../app';

jest.mock('tiktok-shared/dist/state', () => ({ readState: jest.fn() }));
jest.mock('tiktok-shared/dist/commercetools/client', () => ({ createApiRoot: jest.fn(() => ({})) }));
jest.mock('tiktok-shared/dist/tiktok/client', () => ({ getTikTokClient: jest.fn(async () => ({})) }));
jest.mock('tiktok-shared/dist/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('../jobs/reconcile-orders');
jest.mock('../jobs/tokens', () => ({
  ...jest.requireActual('../jobs/tokens'),
  refreshTokensIfExpiring: jest.fn(),
}));

const nowSeconds = () => Math.floor(Date.now() / 1000);
const authorizedState = () => ({
  tiktokAccessToken: 'a',
  tiktokRefreshToken: 'r',
  tiktokRefreshExpiresAt: nowSeconds() + 200 * 86_400,
});
const clean = { searched: 1, alreadyInSync: 1, synced: 0, failed: 0, truncated: false };

describe('POST /refresh-token-job', () => {
  beforeEach(() => {
    jest.mocked(readState).mockResolvedValue(authorizedState());
    jest.mocked(refreshTokensIfExpiring).mockResolvedValue('refreshed');
    jest.mocked(reconcileOrders).mockResolvedValue(clean);
  });

  it('refreshes tokens and reconciles orders', async () => {
    const res = await request(app).post('/refresh-token-job').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', tokens: 'refreshed', orders: clean });
  });

  it.each([
    ['no state', undefined],
    ['no tokens', {}],
    ['an expired authorization', { ...authorizedState(), tiktokRefreshExpiresAt: nowSeconds() - 10 }],
    ['a deauthorized shop', { ...authorizedState(), tiktokAuthorizedAt: 1, tiktokDeauthorizedAt: nowSeconds() }],
  ])('does nothing with %s', async (_name, state) => {
    jest.mocked(readState).mockResolvedValue(state);
    const res = await request(app).post('/refresh-token-job').expect(200);
    expect(res.body.status).toBe('skipped');
    expect(refreshTokensIfExpiring).not.toHaveBeenCalled();
    expect(reconcileOrders).not.toHaveBeenCalled();
  });

  it('still runs when the authorization is about to expire', async () => {
    jest.mocked(readState).mockResolvedValue({ ...authorizedState(), tiktokRefreshExpiresAt: nowSeconds() + 86_400 });
    const res = await request(app).post('/refresh-token-job').expect(200);
    expect(res.body.authorization).toBe('expiring');
    expect(reconcileOrders).toHaveBeenCalled();
  });

  it('reconciles even when the token refresh fails, and reports the failure', async () => {
    jest.mocked(refreshTokensIfExpiring).mockRejectedValue(new Error('TikTok down'));
    await request(app).post('/refresh-token-job').expect(500);
    expect(reconcileOrders).toHaveBeenCalled();
  });

  it('reports a failure when some orders failed to reconcile', async () => {
    jest.mocked(reconcileOrders).mockResolvedValue({ ...clean, failed: 1 });
    await request(app).post('/refresh-token-job').expect(500);
  });

  it('reports a failure when reconciliation throws', async () => {
    jest.mocked(reconcileOrders).mockRejectedValue(new Error('search failed'));
    const res = await request(app).post('/refresh-token-job').expect(500);
    expect(res.body.status).toBe('failed');
  });

  it('answers 404 for other paths', async () => {
    await request(app).post('/elsewhere').expect(404);
  });
});

