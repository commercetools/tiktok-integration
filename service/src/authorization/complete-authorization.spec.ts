import { applyTestEnv } from '../test/support';

jest.mock('../../../shared/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('../../../shared/state');
jest.mock('../../../shared/tiktok/auth');
jest.mock('../../../shared/tiktok/client');
jest.mock('../../../shared/tiktok/webhooks', () => ({
  ...jest.requireActual('../../../shared/tiktok/webhooks'),
  ensureWebhooks: jest.fn(),
}));

applyTestEnv();

import { StoreNotFoundError } from '../../../shared/errors';
import { getTikTokStore, readState, saveTokens, writeState } from '../../../shared/state';
import { exchangeAuthCode } from '../../../shared/tiktok/auth';
import { createTikTokClient } from '../../../shared/tiktok/client';
import { ensureWebhooks } from '../../../shared/tiktok/webhooks';
import { completeAuthorization } from './complete-authorization';

const tokens = {
  accessToken: 'access',
  refreshToken: 'refresh',
  accessTokenExpiresAt: 2000,
  refreshTokenExpiresAt: 3000,
  sellerBaseRegion: 'GB',
};

describe('completeAuthorization', () => {
  const fakeClient = {
    shops: { getAuthorized: jest.fn() },
    warehouses: { list: jest.fn() },
  };

  beforeEach(() => {
    jest.mocked(getTikTokStore).mockResolvedValue({ id: 'store-1' } as never);
    jest.mocked(readState).mockResolvedValue(undefined);
    jest.mocked(exchangeAuthCode).mockResolvedValue(tokens);
    jest.mocked(createTikTokClient).mockReturnValue(fakeClient as never);
    jest.mocked(ensureWebhooks).mockResolvedValue({ registered: ['ORDER_STATUS_CHANGE'], unchanged: [] });
    fakeClient.shops.getAuthorized.mockReset().mockResolvedValue([
      { id: '749', cipher: 'cipher-1', name: 'My Shop', code: 'GBLC1', region: 'GB' },
    ]);
    fakeClient.warehouses.list.mockReset().mockResolvedValue([
      { id: 'w1', entityId: 'e1', name: 'Main', type: 'SALES_WAREHOUSE' },
      { name: 'no id' },
    ]);
  });

  it('derives the shop, stores tokens, warehouses and registers the webhooks', async () => {
    const result = await completeAuthorization({ code: 'the-code', locale: 'en-US' });

    expect(exchangeAuthCode).toHaveBeenCalledWith('the-code');
    expect(writeState).toHaveBeenCalledWith({
      tiktokShopId: '749',
      tiktokShopCipher: 'cipher-1',
      tiktokShopName: 'My Shop',
      tiktokShopCode: 'GBLC1',
      tiktokRegion: 'GB',
      tiktokLocale: 'en-US',
    });
    expect(saveTokens).toHaveBeenCalledWith(tokens, { authorized: true });
    expect(writeState).toHaveBeenCalledWith({
      tiktokWarehouses: JSON.stringify([
        { id: 'w1', entityId: 'e1', name: 'Main', type: 'SALES_WAREHOUSE' },
      ]),
    });
    expect(ensureWebhooks).toHaveBeenCalledWith(fakeClient, 'https://svc.example/service/webhook');
    expect(result).toMatchObject({ shopId: '749', shopName: 'My Shop' });
    expect(result.webhooks.registered).toEqual(['ORDER_STATUS_CHANGE']);
  });

  it('defaults the locale to the stored one, then to en', async () => {
    jest.mocked(readState).mockResolvedValue({ tiktokLocale: 'de' });
    await completeAuthorization({ code: 'c' });
    expect(writeState).toHaveBeenCalledWith(expect.objectContaining({ tiktokLocale: 'de' }));

    jest.mocked(readState).mockResolvedValue(undefined);
    await completeAuthorization({ code: 'c' });
    expect(writeState).toHaveBeenCalledWith(expect.objectContaining({ tiktokLocale: 'en' }));
  });

  it('keeps the connected shop when the seller authorizes several', async () => {
    jest.mocked(readState).mockResolvedValue({ tiktokShopId: '750' });
    fakeClient.shops.getAuthorized.mockResolvedValue([
      { id: '749', cipher: 'c1', name: 'First' },
      { id: '750', cipher: 'c2', name: 'Second' },
    ]);

    const result = await completeAuthorization({ code: 'c' });

    expect(result.shopId).toBe('750');
  });

  it('does not burn the single-use code when there is no Store', async () => {
    jest.mocked(getTikTokStore).mockRejectedValue(new StoreNotFoundError());

    await expect(completeAuthorization({ code: 'c' })).rejects.toBeInstanceOf(StoreNotFoundError);
    expect(exchangeAuthCode).not.toHaveBeenCalled();
  });

  it('still succeeds when the webhooks cannot be registered, and says so', async () => {
    jest.mocked(ensureWebhooks).mockRejectedValue(new Error('TikTok is down'));

    const result = await completeAuthorization({ code: 'c' });

    expect(saveTokens).toHaveBeenCalled();
    expect(result.webhooks.problem).toContain('register them in Partner Center');
  });

  it('still succeeds when the warehouses cannot be read, and says so', async () => {
    fakeClient.warehouses.list.mockRejectedValue(new Error('no scope'));

    const result = await completeAuthorization({ code: 'c' });

    expect(result.warehousesProblem).toContain('shop config sync');
  });

  it('fails when TikTok authorizes no shop', async () => {
    fakeClient.shops.getAuthorized.mockResolvedValue([]);

    await expect(completeAuthorization({ code: 'c' })).rejects.toThrow('no authorized shop');
    expect(saveTokens).not.toHaveBeenCalled();
  });
});
