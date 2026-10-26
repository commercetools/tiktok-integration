import type { ByProjectKeyRequestBuilder, Order } from '@commercetools/platform-sdk';
import { LOOKBACK_SECONDS, TIME_BUDGET_MS, needsSync, reconcileOrders } from './reconcile-orders';

jest.mock('tiktok-shared/dist/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('tiktok-shared/dist/services', () => ({ getShopContext: jest.fn() }));
jest.mock('tiktok-shared/dist/services/order-sync.service', () => ({ syncTiktokOrder: jest.fn() }));

const ctOrder = (tiktokOrderId: string, status: string, updateTime: number) =>
  ({
    id: `ct-${tiktokOrderId}`,
    custom: { fields: { tiktokOrderId, tiktokOrderStatus: status, tiktokUpdateTime: updateTime } },
  }) as unknown as Order;

const fakeApiRoot = (orders: Order[]) => {
  const get = jest.fn(({ queryArgs }: { queryArgs: { where: string } }) => ({
    execute: async () => ({
      body: { results: orders.filter((order) => queryArgs.where.includes(`"${order.custom?.fields?.tiktokOrderId}"`)) },
    }),
  }));
  return { apiRoot: { orders: () => ({ get }) } as unknown as ByProjectKeyRequestBuilder, get };
};

const NOW = 1_800_000_000_000;

describe('needsSync', () => {
  const searched = { id: 'o1', status: 'IN_TRANSIT', updateTime: 200 };

  it('needs a sync for an order commercetools does not have', () => {
    expect(needsSync(undefined, searched)).toBe(true);
  });

  it('needs a sync when TikTok updated the order since', () => {
    expect(needsSync(ctOrder('o1', 'IN_TRANSIT', 100), searched)).toBe(true);
  });

  it('needs a sync when the status differs even if update times match', () => {
    expect(needsSync(ctOrder('o1', 'AWAITING_SHIPMENT', 200), searched)).toBe(true);
  });

  it('does not sync an order that is up to date', () => {
    expect(needsSync(ctOrder('o1', 'IN_TRANSIT', 200), searched)).toBe(false);
    expect(needsSync(ctOrder('o1', 'IN_TRANSIT', 300), searched)).toBe(false);
  });
});

describe('reconcileOrders', () => {
  const page = (orders: unknown[], nextPageToken?: string) => ({ orders, nextPageToken });

  it('syncs only the orders that differ from commercetools', async () => {
    const { apiRoot } = fakeApiRoot([ctOrder('o1', 'COMPLETED', 200), ctOrder('o2', 'AWAITING_SHIPMENT', 100)]);
    const search = jest.fn().mockResolvedValue(
      page([
        { id: 'o1', status: 'COMPLETED', updateTime: 200 },
        { id: 'o2', status: 'IN_TRANSIT', updateTime: 300 },
        { id: 'o3', status: 'UNPAID', updateTime: 250 },
      ]),
    );
    const syncOrder = jest.fn().mockResolvedValue(undefined);

    const result = await reconcileOrders({ apiRoot, client: { orders: { search } } as never, syncOrder, now: () => NOW });

    expect(result).toEqual({ searched: 3, alreadyInSync: 1, synced: 2, failed: 0, truncated: false });
    expect(syncOrder.mock.calls).toEqual([['o2'], ['o3']]);
    const until = NOW / 1000;
    expect(search).toHaveBeenCalledWith(
      { updateTimeGe: until - LOOKBACK_SECONDS, updateTimeLt: until },
      { pageSize: 50, pageToken: undefined },
    );
  });

  it('is idempotent: once synced, a second run finds nothing to do', async () => {
    const stored = [ctOrder('o1', 'COMPLETED', 200)];
    const { apiRoot } = fakeApiRoot(stored);
    const search = jest.fn().mockResolvedValue(page([{ id: 'o1', status: 'COMPLETED', updateTime: 200 }]));
    const syncOrder = jest.fn();
    const deps = { apiRoot, client: { orders: { search } } as never, syncOrder, now: () => NOW };

    await reconcileOrders(deps);
    const second = await reconcileOrders(deps);

    expect(syncOrder).not.toHaveBeenCalled();
    expect(second.alreadyInSync).toBe(1);
  });

  it('follows page tokens until the last page', async () => {
    const { apiRoot } = fakeApiRoot([]);
    const search = jest
      .fn()
      .mockResolvedValueOnce(page([{ id: 'o1', status: 'UNPAID', updateTime: 1 }], 'next'))
      .mockResolvedValueOnce(page([{ id: 'o2', status: 'UNPAID', updateTime: 2 }]));
    const syncOrder = jest.fn().mockResolvedValue(undefined);

    const result = await reconcileOrders({ apiRoot, client: { orders: { search } } as never, syncOrder, now: () => NOW });

    expect(search).toHaveBeenLastCalledWith(expect.anything(), { pageSize: 50, pageToken: 'next' });
    expect(result.synced).toBe(2);
  });

  it('counts a failing order and carries on with the rest', async () => {
    const { apiRoot } = fakeApiRoot([]);
    const search = jest.fn().mockResolvedValue(
      page([
        { id: 'o1', status: 'UNPAID', updateTime: 1 },
        { id: 'o2', status: 'UNPAID', updateTime: 2 },
      ]),
    );
    const syncOrder = jest.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(undefined);

    const result = await reconcileOrders({ apiRoot, client: { orders: { search } } as never, syncOrder, now: () => NOW });

    expect(result).toMatchObject({ synced: 1, failed: 1 });
  });

  it('stops at the time budget and reports the run as truncated', async () => {
    const { apiRoot } = fakeApiRoot([]);
    const search = jest.fn().mockResolvedValue(
      page([
        { id: 'o1', status: 'UNPAID', updateTime: 1 },
        { id: 'o2', status: 'UNPAID', updateTime: 2 },
      ], 'more'),
    );
    let clock = NOW;
    const syncOrder = jest.fn().mockImplementation(async () => {
      clock += TIME_BUDGET_MS;
    });

    const result = await reconcileOrders({ apiRoot, client: { orders: { search } } as never, syncOrder, now: () => clock });

    expect(result).toMatchObject({ synced: 1, truncated: true });
    expect(search).toHaveBeenCalledTimes(1);
  });

  it('skips orders without an id and makes no commercetools query for an empty page', async () => {
    const { apiRoot, get } = fakeApiRoot([]);
    const search = jest.fn().mockResolvedValue(page([{ status: 'UNPAID' }]));
    const result = await reconcileOrders({ apiRoot, client: { orders: { search } } as never, syncOrder: jest.fn(), now: () => NOW });
    expect(result.searched).toBe(0);
    expect(get).not.toHaveBeenCalled();
  });
});
