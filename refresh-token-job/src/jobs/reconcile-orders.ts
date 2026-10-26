import type { ByProjectKeyRequestBuilder, Order } from '@commercetools/platform-sdk';
import { logger } from '../../../shared/logger';
import { getShopContext } from '../../../shared/services';
import { syncTiktokOrder } from '../../../shared/services/order-sync.service';
import type { TikTokClient } from '../../../shared/tiktok/client';

type SearchedOrder = NonNullable<
  Awaited<ReturnType<TikTokClient['orders']['search']>>['orders']
>[number];

/**
 * Orders updated within this window are compared with commercetools. The job runs every 12
 * hours, so every update is seen by about three runs even if one run is skipped or truncated.
 */
export const LOOKBACK_SECONDS = 36 * 3600;
/** Stop well inside the 30 minute limit Connect puts on a job request. */
export const TIME_BUDGET_MS = 25 * 60 * 1000;
const PAGE_SIZE = 50;

export interface ReconcileResult {
  searched: number;
  alreadyInSync: number;
  synced: number;
  failed: number;
  /** True when the time budget ran out before every page was processed. */
  truncated: boolean;
}

export interface ReconcileDeps {
  apiRoot: ByProjectKeyRequestBuilder;
  client: Pick<TikTokClient, 'orders'>;
  /** Syncs one TikTok order; defaults to the order sync the webhook handler uses. */
  syncOrder?: (tiktokOrderId: string) => Promise<void>;
  now?: () => number;
}

const quote = (value: string): string =>
  `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

const customField = (order: Order, name: string): unknown => order.custom?.fields?.[name];

const loadCommercetoolsOrders = async (
  apiRoot: ByProjectKeyRequestBuilder,
  tiktokOrderIds: string[],
): Promise<Map<string, Order>> => {
  const { body } = await apiRoot
    .orders()
    .get({
      queryArgs: {
        where: `custom(fields(tiktokOrderId in (${tiktokOrderIds.map(quote).join(', ')})))`,
        limit: tiktokOrderIds.length,
      },
    })
    .execute();
  const byTiktokId = new Map<string, Order>();
  for (const order of body.results) {
    const id = customField(order, 'tiktokOrderId');
    if (typeof id === 'string') {
      byTiktokId.set(id, order);
    }
  }
  return byTiktokId;
};

/** True when commercetools lacks the order or has not seen TikTok's latest status and update time. */
export const needsSync = (existing: Order | undefined, searched: SearchedOrder): boolean => {
  if (!existing) {
    return true;
  }
  const storedUpdateTime = customField(existing, 'tiktokUpdateTime');
  const updatedSince =
    searched.updateTime !== undefined &&
    (typeof storedUpdateTime !== 'number' || storedUpdateTime < searched.updateTime);
  const statusChanged =
    searched.status !== undefined &&
    customField(existing, 'tiktokOrderStatus') !== searched.status;
  return updatedSince || statusChanged;
};

/**
 * Webhooks are not a guaranteed source of truth, so this pass compares TikTok's recently
 * updated orders with commercetools and syncs any that differ. Idempotent: the order sync
 * re-fetches each order and only writes what differs, so overlapping or repeated runs are safe.
 */
export const reconcileOrders = async (deps: ReconcileDeps): Promise<ReconcileResult> => {
  const now = deps.now ?? Date.now;
  const deadline = now() + TIME_BUDGET_MS;
  const until = Math.floor(now() / 1000);
  const filter = { updateTimeGe: until - LOOKBACK_SECONDS, updateTimeLt: until };
  const syncOrder =
    deps.syncOrder ??
    ((tiktokOrderId: string) =>
      syncTiktokOrder(
        {
          apiRoot: deps.apiRoot,
          tiktok: deps.client,
          getShopContext: () => getShopContext(deps.apiRoot),
        },
        tiktokOrderId,
      ));

  const result: ReconcileResult = {
    searched: 0,
    alreadyInSync: 0,
    synced: 0,
    failed: 0,
    truncated: false,
  };

  let pageToken: string | undefined;
  do {
    const page = await deps.client.orders.search(filter, { pageSize: PAGE_SIZE, pageToken });
    const orders = (page.orders ?? []).filter(
      (order): order is SearchedOrder & { id: string } => typeof order.id === 'string',
    );
    result.searched += orders.length;

    const existing =
      orders.length > 0
        ? await loadCommercetoolsOrders(deps.apiRoot, orders.map(({ id }) => id))
        : new Map<string, Order>();

    for (const order of orders) {
      if (now() >= deadline) {
        result.truncated = true;
        return result;
      }
      if (!needsSync(existing.get(order.id), order)) {
        result.alreadyInSync += 1;
        continue;
      }
      try {
        await syncOrder(order.id);
        result.synced += 1;
      } catch (error) {
        result.failed += 1;
        logger.error('Reconciling a TikTok order failed', {
          tiktokOrderId: order.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    pageToken = page.nextPageToken || undefined;
  } while (pageToken);

  return result;
};
