import { logger } from '../logger';
import type { TikTokClient } from './client';

/** Event API topics this connector handles (plan 08). */
export const WEBHOOK_TOPICS = [
  'ORDER_STATUS_CHANGE',
  'CANCELLATION_STATUS_CHANGE',
  'RETURN_STATUS_CHANGE',
  'REVERSE_STATUS_UPDATE',
  'SELLER_DEAUTHORIZATION',
  'UPCOMING_AUTHORIZATION_EXPIRATION',
] as const;

export type WebhookTopic = (typeof WEBHOOK_TOPICS)[number];

export interface EnsureWebhooksResult {
  registered: string[];
  unchanged: string[];
}

/**
 * Points every topic at `address` via the Event API. Idempotent: topics already registered
 * with the same address are skipped, so it is safe to call after each authorization.
 */
export const ensureWebhooks = async (
  client: TikTokClient,
  address: string,
  topics: readonly string[] = WEBHOOK_TOPICS,
): Promise<EnsureWebhooksResult> => {
  const current = new Map(
    (await client.events.getWebhooks()).map((w) => [w.eventType, w.address]),
  );
  const result: EnsureWebhooksResult = { registered: [], unchanged: [] };
  for (const eventType of topics) {
    if (current.get(eventType) === address) {
      result.unchanged.push(eventType);
      continue;
    }
    await client.events.updateWebhook({ address, eventType });
    result.registered.push(eventType);
  }
  logger.info('TikTok webhooks ensured', result);
  return result;
};
