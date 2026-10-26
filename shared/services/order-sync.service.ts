import type {
  ByProjectKeyRequestBuilder,
  Order,
  OrderUpdateAction,
  Payment,
  PaymentState,
} from '@commercetools/platform-sdk';
import { describeError } from '../errors';
import { logger } from '../logger';
import {
  mapCommercetoolsOrderToTiktokOrderReference,
  mapPaymentState,
  orderStatusToUpdateActions,
  tiktokOrderToCommercetoolsOrderImportDraft,
} from '../mappers/order/order.mapper';
import { tiktokOrderToCommercetoolsPaymentDraft } from '../mappers/payment/payment.mapper';
import type { ShopContext, TiktokSDK } from '../interfaces';
import {
  findCommercetoolsOrderByTiktokOrderId,
  updateCommercetoolsOrderFromTiktokOrder,
} from './update-order.service';
import type { TikTokClient } from '../tiktok/client';

type TiktokOrder = TiktokSDK.Order202507GetOrderDetailResponseDataOrders;

export interface OrderSyncDeps {
  apiRoot: ByProjectKeyRequestBuilder;
  tiktok: Pick<TikTokClient, 'orders'>;
  getShopContext: () => Promise<ShopContext>;
}

const MAX_DUPLICATE_LOOKUPS = 3;

const paymentKey = (tiktokOrderId: string): string => `tiktok-${tiktokOrderId}`;

const isDuplicateField = (error: unknown): boolean => {
  const body = (error as { body?: { errors?: { code?: string }[] } } | null)?.body;
  return body?.errors?.some((entry) => entry.code === 'DuplicateField') ?? false;
};

/**
 * The commercetools order number is the TikTok order id, so two webhooks racing to create the
 * same order cannot both succeed: the loser gets DuplicateField and uses the winner's order.
 */
const importOrder = async (
  deps: OrderSyncDeps,
  order: TiktokOrder,
  shop: ShopContext,
): Promise<{ order: Order; created: boolean }> => {
  const draft = {
    ...tiktokOrderToCommercetoolsOrderImportDraft(order, {
      locale: shop.locale,
      shopRegion: shop.shopRegion,
    }),
    orderNumber: order.id,
  };
  try {
    const { body } = await deps.apiRoot.orders().importOrder().post({ body: draft }).execute();
    return { order: body, created: true };
  } catch (error) {
    if (!isDuplicateField(error)) {
      throw error;
    }
  }
  for (let attempt = 0; attempt < MAX_DUPLICATE_LOOKUPS; attempt += 1) {
    const existing = await findCommercetoolsOrderByTiktokOrderId(deps.apiRoot, order.id as string);
    if (existing) {
      return { order: existing, created: false };
    }
  }
  throw new Error(`Order ${order.id} exists but could not be read back`);
};

const ensurePayment = async (
  deps: OrderSyncDeps,
  order: TiktokOrder,
  shop: ShopContext,
): Promise<Payment> => {
  const key = paymentKey(order.id as string);
  const draft = {
    ...tiktokOrderToCommercetoolsPaymentDraft(order, {
      locale: shop.locale,
      shopRegion: shop.shopRegion,
    }),
    key,
  };
  try {
    const { body } = await deps.apiRoot.payments().post({ body: draft }).execute();
    return body;
  } catch (error) {
    if (!isDuplicateField(error)) {
      throw error;
    }
    const { body } = await deps.apiRoot.payments().withKey({ key }).get().execute();
    return body;
  }
};

const customField = (order: Order, name: string): unknown => order.custom?.fields?.[name];

/**
 * Update actions that bring `existing` in line with the fetched TikTok order. Actions that
 * would not change anything are left out, so replaying a webhook does not touch the order.
 */
const reconcileActions = async (
  deps: OrderSyncDeps,
  existing: Order,
  order: TiktokOrder,
  shop: ShopContext,
): Promise<OrderUpdateAction[]> => {
  const actions: OrderUpdateAction[] = orderStatusToUpdateActions(order.status).filter(
    (action) =>
      !(
        (action.action === 'changeShipmentState' &&
          existing.shipmentState === action.shipmentState) ||
        (action.action === 'changeOrderState' && existing.orderState === action.orderState)
      ),
  );

  const wantedPaymentState: PaymentState = mapPaymentState(order.status, order.paidTime);
  if (wantedPaymentState === 'Paid' && (existing.paymentInfo?.payments.length ?? 0) === 0) {
    const payment = await ensurePayment(deps, order, shop);
    actions.push({ action: 'addPayment', payment: { typeId: 'payment', id: payment.id } });
  }
  if (existing.paymentState !== wantedPaymentState) {
    actions.push({ action: 'changePaymentState', paymentState: wantedPaymentState });
  }

  if (order.status && customField(existing, 'tiktokOrderStatus') !== order.status) {
    actions.push({ action: 'setCustomField', name: 'tiktokOrderStatus', value: order.status });
  }
  if (order.updateTime && customField(existing, 'tiktokUpdateTime') !== order.updateTime) {
    actions.push({ action: 'setCustomField', name: 'tiktokUpdateTime', value: order.updateTime });
  }
  return actions;
};

const syncOne = async (deps: OrderSyncDeps, order: TiktokOrder, shop: ShopContext): Promise<void> => {
  if (!order.id) {
    logger.warn('TikTok returned an order without an id');
    return;
  }
  let existing = await findCommercetoolsOrderByTiktokOrderId(deps.apiRoot, order.id);
  if (!existing) {
    const imported = await importOrder(deps, order, shop);
    existing = imported.order;
    if (imported.created) {
      logger.info('Created commercetools order for TikTok order', { tiktokOrderId: order.id });
      await deps.tiktok.orders
        .addExternalReferences({
          orders: [mapCommercetoolsOrderToTiktokOrderReference(order, existing)],
        })
        .catch((error: unknown) => {
          logger.error('Adding the external order reference in TikTok failed', {
            tiktokOrderId: order.id,
            error: describeError(error),
          });
        });
    }
  }

  const actions = await reconcileActions(deps, existing, order, shop);
  if (actions.length === 0) {
    logger.info('TikTok order already in sync', { tiktokOrderId: order.id, status: order.status });
    return;
  }
  await updateCommercetoolsOrderFromTiktokOrder(deps.apiRoot, order.id, actions);
  logger.info('Updated commercetools order from TikTok order', {
    tiktokOrderId: order.id,
    status: order.status,
    actions: actions.map(({ action }) => action),
  });
};

/**
 * Creates or updates the commercetools order for a TikTok order id. The order is always read
 * back from TikTok and compared with commercetools, never rebuilt from the webhook payload, so
 * duplicated, delayed or out-of-order webhooks all converge on the same result.
 */
export const syncTiktokOrder = async (deps: OrderSyncDeps, tiktokOrderId: string): Promise<void> => {
  const orders = await deps.tiktok.orders.get([tiktokOrderId]);
  if (orders.length === 0) {
    logger.warn('TikTok returned no order for the webhook', { tiktokOrderId });
    return;
  }
  const shop = await deps.getShopContext();
  for (const order of orders) {
    await syncOne(deps, order, shop);
  }
};

/** Marks the order cancelled once TikTok reports a completed cancellation. */
export const markOrderCancelled = async (
  deps: Pick<OrderSyncDeps, 'apiRoot'>,
  tiktokOrderId: string,
): Promise<void> => {
  const existing = await findCommercetoolsOrderByTiktokOrderId(deps.apiRoot, tiktokOrderId);
  if (!existing || existing.orderState === 'Cancelled') {
    return;
  }
  await updateCommercetoolsOrderFromTiktokOrder(deps.apiRoot, tiktokOrderId, [
    { action: 'changeOrderState', orderState: 'Cancelled' },
  ]);
};
