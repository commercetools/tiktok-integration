import { readConfiguration } from 'tiktok-shared/dist/config';
import { logger } from 'tiktok-shared/dist/logger';
import type { TikTokClient } from 'tiktok-shared/dist/tiktok/client';
import { ensureWebhooks, WEBHOOK_TOPICS } from 'tiktok-shared/dist/tiktok/webhooks';

export interface WebhookRegistration {
  address?: string;
  registered: string[];
  unchanged: string[];
  /** Why nothing (or not everything) was registered; the manual Partner Center fallback applies. */
  problem?: string;
}

/**
 * The URL TikTok must call: `<CONNECT_SERVICE_URL>/webhook`, with the `/service` endpoint
 * prefix added when Connect's URL does not already end in it.
 */
export const webhookAddress = (): string | undefined => {
  const { connectServiceUrl } = readConfiguration();
  if (!connectServiceUrl) {
    return undefined;
  }
  const base = `${connectServiceUrl.origin}${connectServiceUrl.pathname.replace(/\/+$/, '')}`;
  const root = base.endsWith('/service') ? base : `${base}/service`;
  return `${root}/webhook`;
};

/** Idempotently registers the webhook topics; never throws, so authorization can still succeed. */
export const registerWebhooks = async (client: TikTokClient): Promise<WebhookRegistration> => {
  const address = webhookAddress();
  if (!address) {
    return {
      registered: [],
      unchanged: [],
      problem: 'CONNECT_SERVICE_URL is not set; register the webhook URL in Partner Center',
    };
  }
  try {
    return { address, ...(await ensureWebhooks(client, address)) };
  } catch (error) {
    logger.error('Registering TikTok webhooks failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      address,
      registered: [],
      unchanged: [],
      problem: 'Registering the webhooks with TikTok failed; register them in Partner Center',
    };
  }
};

export interface WebhookStatus {
  address?: string;
  registered: string[];
  missing: string[];
}

/** Which topics TikTok currently delivers to this service. Undefined when TikTok cannot be asked. */
export const readWebhookStatus = async (client: TikTokClient): Promise<WebhookStatus | undefined> => {
  const address = webhookAddress();
  try {
    const current = await client.events.getWebhooks();
    const registered = WEBHOOK_TOPICS.filter((topic) =>
      current.some((webhook) => webhook.eventType === topic && webhook.address === address),
    );
    return {
      ...(address ? { address } : {}),
      registered,
      missing: WEBHOOK_TOPICS.filter((topic) => !registered.includes(topic)),
    };
  } catch (error) {
    logger.warn('Reading TikTok webhooks failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
};
