import { isAuthorized, readState } from 'tiktok-shared/dist/state';
import { getTikTokClient } from 'tiktok-shared/dist/tiktok/client';
import { TtlCache } from 'tiktok-shared/dist/utils/ttl-cache';
import { parseStoredWarehouses } from '../authorization/shop';
import {
  readWebhookStatus,
  webhookAddress,
  type WebhookStatus,
} from '../authorization/webhook-registration';

const WEBHOOK_STATUS_TTL_MS = 60_000;
const webhookStatusCache = new TtlCache<WebhookStatus | undefined>(WEBHOOK_STATUS_TTL_MS);

export interface ConnectionStatus {
  connected: boolean;
  shop?: { id: string; name?: string; code?: string; region?: string };
  warehouses: { id: string; name?: string; type?: string }[];
  /** Unix seconds. */
  authorizedAt?: number;
  accessTokenExpiresAt?: number;
  /** After this the seller has to authorize again. */
  refreshTokenExpiresAt?: number;
  deauthorizedAt?: number;
  /** False until a Store flagged `isTikTokShop=true` exists (Terraform not applied). */
  storeFound: boolean;
  /** True when Connect's service URL is known, so webhooks can be registered. */
  serviceConfigured: boolean;
  webhooks?: WebhookStatus;
}

/** What the Merchant Center shows about the TikTok connection. Never contains tokens. */
export const getConnectionStatus = async (): Promise<ConnectionStatus> => {
  const state = await readState();
  const connected = await isAuthorized();

  const webhooks = connected
    ? await webhookStatusCache.getOrLoad('webhooks', async () =>
        readWebhookStatus(await getTikTokClient()),
      )
    : undefined;

  return {
    connected,
    ...(state?.tiktokShopId
      ? {
          shop: {
            id: state.tiktokShopId,
            ...(state.tiktokShopName ? { name: state.tiktokShopName } : {}),
            ...(state.tiktokShopCode ? { code: state.tiktokShopCode } : {}),
            ...(state.tiktokRegion ? { region: state.tiktokRegion } : {}),
          },
        }
      : {}),
    warehouses: parseStoredWarehouses(state?.tiktokWarehouses).map(({ id, name, type }) => ({
      id,
      ...(name ? { name } : {}),
      ...(type ? { type } : {}),
    })),
    ...(state?.tiktokAuthorizedAt ? { authorizedAt: state.tiktokAuthorizedAt } : {}),
    ...(connected && state?.tiktokAccessExpiresAt
      ? { accessTokenExpiresAt: state.tiktokAccessExpiresAt }
      : {}),
    ...(connected && state?.tiktokRefreshExpiresAt
      ? { refreshTokenExpiresAt: state.tiktokRefreshExpiresAt }
      : {}),
    ...(state?.tiktokDeauthorizedAt ? { deauthorizedAt: state.tiktokDeauthorizedAt } : {}),
    storeFound: state !== undefined,
    serviceConfigured: webhookAddress() !== undefined,
    ...(webhooks ? { webhooks } : {}),
  };
};
