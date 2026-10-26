import type {
  ByProjectKeyRequestBuilder,
  Order,
  OrderImportDraft,
  OrderUpdateAction,
} from '@commercetools/platform-sdk';

jest.mock('../logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import type { ShopContext, TiktokSDK } from '../interfaces';
import { markOrderCancelled, syncTiktokOrder, type OrderSyncDeps } from './order-sync.service';

type TiktokOrder = TiktokSDK.Order202507GetOrderDetailResponseDataOrders;
type MutableOrder = { -readonly [K in keyof Order]: Order[K] };

const TIKTOK_ORDER_ID = '576653688135258178';

const tiktokOrder = (overrides: Partial<TiktokOrder> = {}): TiktokOrder =>
  ({
    id: TIKTOK_ORDER_ID,
    status: 'UNPAID',
    buyerEmail: 'buyer@example.com',
    paymentMethodName: 'CARD',
    createTime: 1718305000,
    updateTime: 1718305585,
    payment: { currency: 'USD', totalAmount: '27.50', subTotal: '25.00', tax: '2.50' },
    lineItems: [{ id: 'li-1', productName: 'Mug', sellerSku: 'MUG-1', salePrice: '25.00' }],
    recipientAddress: { name: 'Jane Doe', regionCode: 'US' },
    ...overrides,
  }) as TiktokOrder;

const duplicateField = () =>
  Object.assign(new Error('duplicate'), {
    statusCode: 400,
    body: { errors: [{ code: 'DuplicateField' }] },
  });

/** Just enough of the commercetools API for the order and payment calls the sync makes. */
const createFakeCommercetools = () => {
  const orders: MutableOrder[] = [];
  const payments: { id: string; key?: string }[] = [];
  const calls = { imports: 0, updates: [] as OrderUpdateAction[][] };

  const apply = (order: MutableOrder, action: OrderUpdateAction): void => {
    switch (action.action) {
      case 'changeShipmentState':
        order.shipmentState = action.shipmentState;
        break;
      case 'changeOrderState':
        order.orderState = action.orderState;
        break;
      case 'changePaymentState':
        order.paymentState = action.paymentState;
        break;
      case 'addPayment':
        order.paymentInfo = {
          payments: [
            ...(order.paymentInfo?.payments ?? []),
            { typeId: 'payment', id: action.payment.id as string },
          ],
        };
        break;
      case 'setCustomField':
        order.custom = {
          ...(order.custom as NonNullable<Order['custom']>),
          fields: { ...order.custom?.fields, [action.name]: action.value },
        };
        break;
      default:
        throw new Error(`Unexpected action ${action.action}`);
    }
  };

  const apiRoot = {
    orders: () => ({
      get: ({ queryArgs }: { queryArgs: { where: string } }) => ({
        execute: async () => {
          const id = /tiktokOrderId="([^"]*)"/.exec(queryArgs.where)?.[1];
          return {
            body: { results: orders.filter((order) => order.custom?.fields?.tiktokOrderId === id) },
          };
        },
      }),
      importOrder: () => ({
        post: ({ body }: { body: OrderImportDraft & { orderNumber: string } }) => ({
          execute: async () => {
            calls.imports += 1;
            if (orders.some((order) => order.orderNumber === body.orderNumber)) {
              throw duplicateField();
            }
            const order = {
              id: `ct-${orders.length + 1}`,
              version: 1,
              orderNumber: body.orderNumber,
              orderState: body.orderState,
              shipmentState: body.shipmentState,
              custom: body.custom,
              lineItems: body.lineItems?.map((item, index) => ({
                id: `ct-li-${index}`,
                variant: item.variant,
              })),
            } as unknown as Order;
            orders.push(order);
            return { body: order };
          },
        }),
      }),
      withId: ({ ID }: { ID: string }) => ({
        post: ({ body }: { body: { actions: OrderUpdateAction[] } }) => ({
          execute: async () => {
            const order = orders.find((candidate) => candidate.id === ID) as MutableOrder;
            calls.updates.push(body.actions);
            body.actions.forEach((action) => apply(order, action));
            return { body: order };
          },
        }),
      }),
    }),
    payments: () => ({
      post: ({ body }: { body: { key?: string } }) => ({
        execute: async () => {
          if (payments.some((payment) => payment.key === body.key)) {
            throw duplicateField();
          }
          const payment = { id: `pay-${payments.length + 1}`, key: body.key };
          payments.push(payment);
          return { body: payment };
        },
      }),
      withKey: ({ key }: { key: string }) => ({
        get: () => ({
          execute: async () => ({ body: payments.find((payment) => payment.key === key) }),
        }),
      }),
    }),
  } as unknown as ByProjectKeyRequestBuilder;

  return { apiRoot, orders, payments, calls };
};

const shop: ShopContext = {
  locale: 'en-US',
  shopRegion: 'US',
  ctSupplyChannelId: 'channel-1',
  tiktokWarehouseId: 'warehouse-1',
};

describe('syncTiktokOrder', () => {
  let ct: ReturnType<typeof createFakeCommercetools>;
  let current: TiktokOrder[];
  let deps: OrderSyncDeps;
  const addExternalReferences = jest.fn();

  beforeEach(() => {
    ct = createFakeCommercetools();
    current = [tiktokOrder()];
    addExternalReferences.mockReset().mockResolvedValue(undefined);
    deps = {
      apiRoot: ct.apiRoot,
      tiktok: {
        orders: { get: jest.fn(async () => current), addExternalReferences },
      } as unknown as OrderSyncDeps['tiktok'],
      getShopContext: async () => shop,
    };
  });

  it('creates the order once, keyed by the TikTok order id, and tells TikTok about it', async () => {
    await syncTiktokOrder(deps, TIKTOK_ORDER_ID);

    expect(ct.orders).toHaveLength(1);
    expect(ct.orders[0]).toMatchObject({
      orderNumber: TIKTOK_ORDER_ID,
      orderState: 'Open',
      paymentState: 'Pending',
      custom: { fields: { tiktokOrderId: TIKTOK_ORDER_ID, tiktokOrderStatus: 'UNPAID' } },
    });
    expect(addExternalReferences).toHaveBeenCalledTimes(1);
    expect(addExternalReferences.mock.calls[0][0].orders[0]).toMatchObject({
      id: TIKTOK_ORDER_ID,
      externalOrder: { id: 'ct-1', platform: 'COMMERCETOOLS' },
    });
  });

  it('is idempotent: replaying the same webhook changes nothing', async () => {
    await syncTiktokOrder(deps, TIKTOK_ORDER_ID);
    const updatesAfterFirst = ct.calls.updates.length;

    await syncTiktokOrder(deps, TIKTOK_ORDER_ID);
    await syncTiktokOrder(deps, TIKTOK_ORDER_ID);

    expect(ct.orders).toHaveLength(1);
    expect(ct.calls.imports).toBe(1);
    expect(ct.calls.updates).toHaveLength(updatesAfterFirst);
    expect(addExternalReferences).toHaveBeenCalledTimes(1);
  });

  it('records the payment and moves the shipment state as the order progresses', async () => {
    await syncTiktokOrder(deps, TIKTOK_ORDER_ID);

    current = [tiktokOrder({ status: 'AWAITING_SHIPMENT', paidTime: 1718305100, updateTime: 1718305700 })];
    await syncTiktokOrder(deps, TIKTOK_ORDER_ID);

    expect(ct.orders[0]).toMatchObject({
      paymentState: 'Paid',
      shipmentState: 'Ready',
      paymentInfo: { payments: [{ id: 'pay-1' }] },
      custom: { fields: { tiktokOrderStatus: 'AWAITING_SHIPMENT', tiktokUpdateTime: 1718305700 } },
    });
    expect(ct.payments).toEqual([{ id: 'pay-1', key: `tiktok-${TIKTOK_ORDER_ID}` }]);

    const updates = ct.calls.updates.length;
    await syncTiktokOrder(deps, TIKTOK_ORDER_ID);
    expect(ct.calls.updates).toHaveLength(updates);
    expect(ct.payments).toHaveLength(1);
  });

  it('converges when webhooks arrive out of order, because it re-reads TikTok', async () => {
    current = [tiktokOrder({ status: 'DELIVERED', paidTime: 1718305100 })];

    await syncTiktokOrder(deps, TIKTOK_ORDER_ID); // the late "UNPAID" webhook would do the same
    await syncTiktokOrder(deps, TIKTOK_ORDER_ID);

    expect(ct.orders[0]).toMatchObject({ shipmentState: 'Delivered', paymentState: 'Paid' });
  });

  it('completes the order when TikTok says COMPLETED, and cancels it on CANCEL', async () => {
    current = [tiktokOrder({ status: 'COMPLETED', paidTime: 1718305100 })];
    await syncTiktokOrder(deps, TIKTOK_ORDER_ID);
    expect(ct.orders[0]).toMatchObject({ orderState: 'Complete', shipmentState: 'Delivered' });

    current = [tiktokOrder({ status: 'CANCEL', paidTime: 1718305100 })];
    await syncTiktokOrder(deps, TIKTOK_ORDER_ID);
    expect(ct.orders[0].orderState).toBe('Cancelled');
  });

  it('creates one order when two webhooks race', async () => {
    await Promise.all([syncTiktokOrder(deps, TIKTOK_ORDER_ID), syncTiktokOrder(deps, TIKTOK_ORDER_ID)]);

    expect(ct.orders).toHaveLength(1);
    expect(ct.calls.imports).toBe(2);
    expect(addExternalReferences).toHaveBeenCalledTimes(1);
  });

  it('adds one payment when two paid-order webhooks race', async () => {
    current = [tiktokOrder({ status: 'AWAITING_SHIPMENT', paidTime: 1718305100 })];
    await syncTiktokOrder(deps, TIKTOK_ORDER_ID);
    ct.orders[0].paymentInfo = undefined;

    await Promise.all([syncTiktokOrder(deps, TIKTOK_ORDER_ID), syncTiktokOrder(deps, TIKTOK_ORDER_ID)]);

    expect(ct.payments).toHaveLength(1);
  });

  it('keeps the order when adding the external reference fails', async () => {
    addExternalReferences.mockRejectedValue(new Error('TikTok is down'));

    await syncTiktokOrder(deps, TIKTOK_ORDER_ID);

    expect(ct.orders).toHaveLength(1);
  });

  it('does nothing when TikTok returns no order', async () => {
    current = [];

    await syncTiktokOrder(deps, TIKTOK_ORDER_ID);

    expect(ct.calls.imports).toBe(0);
    expect(ct.calls.updates).toHaveLength(0);
  });

  it('propagates a TikTok failure so it is logged by the caller', async () => {
    jest.mocked(deps.tiktok.orders.get).mockRejectedValue(new Error('rate limited'));

    await expect(syncTiktokOrder(deps, TIKTOK_ORDER_ID)).rejects.toThrow('rate limited');
  });
});

describe('markOrderCancelled', () => {
  it('cancels an open order once and leaves a cancelled or unknown one alone', async () => {
    const ct = createFakeCommercetools();
    await markOrderCancelled(ct, TIKTOK_ORDER_ID);
    expect(ct.calls.updates).toHaveLength(0);

    ct.orders.push({
      id: 'ct-1',
      version: 1,
      orderState: 'Open',
      custom: { fields: { tiktokOrderId: TIKTOK_ORDER_ID } },
    } as unknown as Order);

    await markOrderCancelled(ct, TIKTOK_ORDER_ID);
    await markOrderCancelled(ct, TIKTOK_ORDER_ID);

    expect(ct.orders[0].orderState).toBe('Cancelled');
    expect(ct.calls.updates).toHaveLength(1);
  });
});
