import { z } from 'zod';
import type { WebhookTopic } from '../../../shared/tiktok/webhooks';

/** TikTok's webhook envelope (plan 08). Topic data stays untyped: its shape varies per topic. */
export const envelopeSchema = z.object({
  type: z.number().optional(),
  tts_notification_id: z.string().optional(),
  shop_id: z.string().optional(),
  timestamp: z.number().optional(),
  data: z.record(z.string(), z.unknown()).default({}),
});

export type WebhookEnvelope = z.infer<typeof envelopeSchema>;

const has = (data: Record<string, unknown>, ...keys: string[]): boolean =>
  keys.some((key) => data[key] !== undefined);

/**
 * TikTok does not publish every numeric `type` and advises against branching on it alone, so
 * the payload shape decides first; `type` only settles topics whose data has no telltale field.
 * Returns undefined for topics this connector does not handle.
 */
export const classifyWebhook = ({ type, data }: WebhookEnvelope): WebhookTopic | undefined => {
  if (has(data, 'cancel_id', 'cancel_status')) return 'CANCELLATION_STATUS_CHANGE';
  if (has(data, 'return_id', 'return_status')) return 'RETURN_STATUS_CHANGE';
  if (has(data, 'reverse_order_id', 'reverse_order_status', 'reverse_event_type')) {
    return 'REVERSE_STATUS_UPDATE';
  }
  if (has(data, 'order_status')) return 'ORDER_STATUS_CHANGE';
  switch (type) {
    case 1:
      return 'ORDER_STATUS_CHANGE';
    case 2:
      return 'REVERSE_STATUS_UPDATE';
    case 6:
      return 'SELLER_DEAUTHORIZATION';
    case 7:
      return 'UPCOMING_AUTHORIZATION_EXPIRATION';
    case 11:
      return 'CANCELLATION_STATUS_CHANGE';
    case 12:
      return 'RETURN_STATUS_CHANGE';
    default:
      return undefined;
  }
};
