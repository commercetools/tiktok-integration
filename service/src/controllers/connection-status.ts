import { isAuthorized, readState } from 'tiktok-shared/dist/src/state';
import { getTikTokClient } from 'tiktok-shared/dist/src/tiktok/client';
import { TtlCache } from 'tiktok-shared/dist/src/utils/ttl-cache';
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

/** `{ [key]: value }` when the value is present, otherwise nothing, for spreading into an object. */
const only = <K extends string, V>(key: K, value: V | undefined): { [P in K]?: V } =>
  value ? ({ [key]: value } as { [P in K]?: V }) : {};

const shopOf = (state: Awaited<ReturnType<typeof readState>>): Pick<ConnectionStatus, 'shop'> =>
  state?.tiktokShopId
    ? {
        shop: {
          id: state.tiktokShopId,
          ...only('name', state.tiktokShopName),
          ...only('code', state.tiktokShopCode),
          ...only('region', state.tiktokRegion),
        },
      }
    : {};

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
    ...shopOf(state),
    warehouses: parseStoredWarehouses(state?.tiktokWarehouses).map(({ id, name, type }) => ({
      id,
      ...only('name', name),
      ...only('type', type),
    })),
    ...only('authorizedAt', state?.tiktokAuthorizedAt),
    ...only('accessTokenExpiresAt', connected ? state?.tiktokAccessExpiresAt : undefined),
    ...only('refreshTokenExpiresAt', connected ? state?.tiktokRefreshExpiresAt : undefined),
    ...only('deauthorizedAt', state?.tiktokDeauthorizedAt),
    storeFound: state !== undefined,
    serviceConfigured: webhookAddress() !== undefined,
    ...only('webhooks', webhooks),
  };
};
