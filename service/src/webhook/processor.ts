import { logger } from 'tiktok-shared/dist/src/logger';
import { mapCancellationStatus, mapReturnStatus } from 'tiktok-shared/dist/src/mappers/returns/return.mapper';
import type { ReverseStatusInfo } from 'tiktok-shared/dist/src/mappers/returns/return.mapper';
import type { WebhookTopic } from 'tiktok-shared/dist/src/tiktok/webhooks';
import { classifyWebhook, type WebhookEnvelope } from './envelope';
import { markOrderCancelled, syncTiktokOrder, type OrderSyncDeps } from 'tiktok-shared/dist/src/services/order-sync.service';

export interface WebhookProcessorDeps {
  /** `tiktokShopId` of the connected shop; undefined when none is connected. */
  getShopId: () => Promise<string | undefined>;
  clearAuthorization: () => Promise<void>;
  orderSync: () => Promise<OrderSyncDeps>;
}

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value !== '' ? value : undefined;

const describe = (info: ReverseStatusInfo | undefined) =>
  info
    ? {
        kind: info.kind,
        phase: info.phase,
        refund: info.refund,
        terminal: info.terminal,
        requiresSellerAction: info.requiresSellerAction,
      }
    : { classified: false };

/**
 * Handles one verified webhook. Never throws for payload problems: a webhook that cannot be
 * handled is logged, because the request was already acknowledged. Handlers are idempotent
 * (see order-sync), so there is no dedupe store; the notification id is logged for tracing.
 */
export const createWebhookProcessor = (deps: WebhookProcessorDeps) => {
  const syncOrderById = async (orderId: string | undefined, topic: WebhookTopic) => {
    if (!orderId) {
      logger.warn('Webhook carries no order id; nothing to sync', { topic });
      return undefined;
    }
    const orderDeps = await deps.orderSync();
    await syncTiktokOrder(orderDeps, orderId);
    return orderDeps;
  };

  const handlers: Record<WebhookTopic, (envelope: WebhookEnvelope) => Promise<void>> = {
    ORDER_STATUS_CHANGE: async ({ data }) => {
      await syncOrderById(asString(data.order_id), 'ORDER_STATUS_CHANGE');
    },

    CANCELLATION_STATUS_CHANGE: async ({ data }) => {
      const orderId = asString(data.order_id);
      const info = mapCancellationStatus(asString(data.cancel_status));
      logger.info('TikTok cancellation status changed', {
        orderId,
        cancelId: asString(data.cancel_id),
        status: asString(data.cancel_status),
        ...describe(info),
      });
      const orderDeps = await syncOrderById(orderId, 'CANCELLATION_STATUS_CHANGE');
      if (orderDeps && orderId && info?.phase === 'Completed') {
        await markOrderCancelled(orderDeps, orderId);
      }
    },

    RETURN_STATUS_CHANGE: async ({ data }) => {
      logger.info('TikTok return status changed', {
        orderId: asString(data.order_id),
        returnId: asString(data.return_id),
        status: asString(data.return_status),
        ...describe(mapReturnStatus(asString(data.return_status))),
      });
      await syncOrderById(asString(data.order_id), 'RETURN_STATUS_CHANGE');
    },

    REVERSE_STATUS_UPDATE: async ({ data }) => {
      logger.info('TikTok reverse order status updated', {
        orderId: asString(data.order_id),
        reverseOrderId: asString(data.reverse_order_id),
      });
      await syncOrderById(asString(data.order_id), 'REVERSE_STATUS_UPDATE');
    },

    SELLER_DEAUTHORIZATION: async () => {
      await deps.clearAuthorization();
      logger.warn('The seller deauthorized the app; stored TikTok tokens were cleared');
    },

    UPCOMING_AUTHORIZATION_EXPIRATION: async ({ data }) => {
      logger.warn('The TikTok authorization expires soon; authorize again from the Merchant Center', {
        data,
      });
    },
  };

  return async (envelope: WebhookEnvelope): Promise<void> => {
    const topic = classifyWebhook(envelope);
    const notificationId = envelope.tts_notification_id;
    if (!topic) {
      logger.info('Ignoring a webhook for an unhandled topic', {
        type: envelope.type,
        notificationId,
      });
      return;
    }
    const connectedShopId = await deps.getShopId();
    if (!connectedShopId || envelope.shop_id !== connectedShopId) {
      logger.warn('Ignoring a webhook for a shop other than the connected one', {
        topic,
        notificationId,
        shopId: envelope.shop_id,
      });
      return;
    }
    logger.info('Processing TikTok webhook', { topic, notificationId });
    await handlers[topic](envelope);
  };
};

export type WebhookProcessor = ReturnType<typeof createWebhookProcessor>;
