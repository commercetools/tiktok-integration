import type { TikTokClient } from '../tiktok/client';
import { WEBHOOK_TOPICS, ensureWebhooks } from '../tiktok/webhooks';

jest.mock('../logger', () => ({ logger: { info: jest.fn(), warn: jest.fn() } }));

const address = 'https://svc.example/service/webhook';

const clientWith = (existing: Array<{ eventType: string; address: string }>) => {
  const updateWebhook = jest.fn().mockResolvedValue(undefined);
  const client = {
    events: { getWebhooks: jest.fn().mockResolvedValue(existing), updateWebhook },
  } as unknown as TikTokClient;
  return { client, updateWebhook };
};

describe('ensureWebhooks', () => {
  it('registers every missing topic', async () => {
    const { client, updateWebhook } = clientWith([]);
    const result = await ensureWebhooks(client, address);
    expect(result.registered).toEqual([...WEBHOOK_TOPICS]);
    expect(updateWebhook).toHaveBeenCalledWith({ address, eventType: WEBHOOK_TOPICS[0] });
  });

  it('is idempotent and repoints topics registered with another address', async () => {
    const { client, updateWebhook } = clientWith([
      { eventType: 'ORDER_STATUS_CHANGE', address },
      { eventType: 'RETURN_STATUS_CHANGE', address: 'https://old.example/webhook' },
    ]);
    const result = await ensureWebhooks(client, address);
    expect(result.unchanged).toEqual(['ORDER_STATUS_CHANGE']);
    expect(result.registered).toContain('RETURN_STATUS_CHANGE');
    expect(updateWebhook).toHaveBeenCalledTimes(WEBHOOK_TOPICS.length - 1);

    const again = clientWith(WEBHOOK_TOPICS.map((eventType) => ({ eventType, address })));
    await ensureWebhooks(again.client, address);
    expect(again.updateWebhook).not.toHaveBeenCalled();
  });
});
