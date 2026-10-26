jest.mock('../../../shared/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('../../../shared/services/order-sync.service');

import { markOrderCancelled, syncTiktokOrder, type OrderSyncDeps } from '../../../shared/services/order-sync.service';
import { classifyWebhook, type WebhookEnvelope } from './envelope';
import { createWebhookProcessor } from './processor';

const envelope = (type: number | undefined, data: Record<string, unknown>, shopId = 'shop-1'): WebhookEnvelope => ({
  type,
  shop_id: shopId,
  tts_notification_id: 'n-1',
  data,
});

describe('classifyWebhook', () => {
  it.each([
    [envelope(1, { order_id: '1', order_status: 'UNPAID' }), 'ORDER_STATUS_CHANGE'],
    [envelope(undefined, { order_id: '1', order_status: 'CANCEL' }), 'ORDER_STATUS_CHANGE'],
    [envelope(11, { order_id: '1', cancel_id: 'c1', cancel_status: 'CANCELLATION_REQUEST_PENDING' }), 'CANCELLATION_STATUS_CHANGE'],
    [envelope(12, { order_id: '1', return_id: 'r1', return_status: 'RETURN_OR_REFUND_REQUEST_PENDING' }), 'RETURN_STATUS_CHANGE'],
    [envelope(2, { order_id: '1', reverse_order_id: 'x' }), 'REVERSE_STATUS_UPDATE'],
    [envelope(6, {}), 'SELLER_DEAUTHORIZATION'],
    [envelope(7, { expiration_time: 1 }), 'UPCOMING_AUTHORIZATION_EXPIRATION'],
    [envelope(5, { product_id: '1', status: 'ACTIVE' }), undefined],
    [envelope(undefined, {}), undefined],
  ])('classifies %j as %s', (input, topic) => {
    expect(classifyWebhook(input)).toBe(topic);
  });

  it('lets the payload shape win over a misleading type', () => {
    expect(classifyWebhook(envelope(6, { order_id: '1', order_status: 'UNPAID' }))).toBe('ORDER_STATUS_CHANGE');
  });
});

describe('webhook processor', () => {
  const orderDeps = { apiRoot: {} } as OrderSyncDeps;
  const clearAuthorization = jest.fn();
  const getShopId = jest.fn();
  const process = createWebhookProcessor({
    getShopId,
    clearAuthorization,
    orderSync: async () => orderDeps,
  });

  beforeEach(() => {
    getShopId.mockReset().mockResolvedValue('shop-1');
    clearAuthorization.mockReset().mockResolvedValue(undefined);
    jest.mocked(syncTiktokOrder).mockReset().mockResolvedValue(undefined);
    jest.mocked(markOrderCancelled).mockReset().mockResolvedValue(undefined);
  });

  it('syncs the order of an ORDER_STATUS_CHANGE', async () => {
    await process(envelope(1, { order_id: '123', order_status: 'UNPAID' }));

    expect(syncTiktokOrder).toHaveBeenCalledWith(orderDeps, '123');
  });

  it('syncs the order and marks it cancelled when a cancellation completes', async () => {
    await process(envelope(11, { order_id: '123', cancel_id: 'c', cancel_status: 'CANCELLATION_REQUEST_COMPLETE' }));

    expect(syncTiktokOrder).toHaveBeenCalledWith(orderDeps, '123');
    expect(markOrderCancelled).toHaveBeenCalledWith(orderDeps, '123');
  });

  it('only syncs the order while a cancellation is pending', async () => {
    await process(envelope(11, { order_id: '123', cancel_id: 'c', cancel_status: 'CANCELLATION_REQUEST_PENDING' }));

    expect(syncTiktokOrder).toHaveBeenCalledTimes(1);
    expect(markOrderCancelled).not.toHaveBeenCalled();
  });

  it.each([
    ['a return', envelope(12, { order_id: '9', return_id: 'r', return_status: 'BUYER_SHIPPED_ITEM' })],
    ['a reverse status update', envelope(2, { order_id: '9', reverse_order_id: 'x' })],
  ])('re-syncs the order for %s', async (_name, input) => {
    await process(input);

    expect(syncTiktokOrder).toHaveBeenCalledWith(orderDeps, '9');
  });

  it('clears the authorization on SELLER_DEAUTHORIZATION', async () => {
    await process(envelope(6, {}));

    expect(clearAuthorization).toHaveBeenCalledTimes(1);
  });

  it('only logs UPCOMING_AUTHORIZATION_EXPIRATION', async () => {
    await process(envelope(7, { expiration_time: 1 }));

    expect(clearAuthorization).not.toHaveBeenCalled();
    expect(syncTiktokOrder).not.toHaveBeenCalled();
  });

  it('ignores a webhook of another shop, including a deauthorization', async () => {
    await process(envelope(6, {}, 'someone-else'));
    await process(envelope(1, { order_id: '1', order_status: 'UNPAID' }, 'someone-else'));

    expect(clearAuthorization).not.toHaveBeenCalled();
    expect(syncTiktokOrder).not.toHaveBeenCalled();
  });

  it('ignores webhooks while no shop is connected', async () => {
    getShopId.mockResolvedValue(undefined);

    await process(envelope(1, { order_id: '1', order_status: 'UNPAID' }));

    expect(syncTiktokOrder).not.toHaveBeenCalled();
  });

  it('acknowledges unhandled topics without doing anything', async () => {
    await expect(process(envelope(5, { product_id: '1' }))).resolves.toBeUndefined();

    expect(syncTiktokOrder).not.toHaveBeenCalled();
  });

  it('does not sync when the payload has no order id', async () => {
    await process(envelope(1, { order_status: 'UNPAID' }));

    expect(syncTiktokOrder).not.toHaveBeenCalled();
  });
});
