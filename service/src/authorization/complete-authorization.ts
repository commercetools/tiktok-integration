import { logger } from 'tiktok-shared/dist/logger';
import { getTikTokStore, readState, saveTokens } from 'tiktok-shared/dist/state';
import { exchangeAuthCode } from 'tiktok-shared/dist/tiktok/auth';
import {
  buildShopClient,
  localeOrDefault,
  persistShop,
  pickShop,
  refreshWarehouses,
} from './shop';
import { registerWebhooks, type WebhookRegistration } from './webhook-registration';

export interface AuthorizationInput {
  /** The `code` of TikTok's redirect; single-use. */
  code: string;
  /** TikTok's `locale` redirect parameter. */
  locale?: string;
  /** TikTok's `shop_region` redirect parameter. */
  shopRegion?: string;
}

export interface AuthorizationResult {
  shopId: string;
  shopName: string;
  webhooks: WebhookRegistration;
  /** Set when the warehouses could not be read; the shop config sync retries it. */
  warehousesProblem?: string;
}

/**
 * Turns the redirect `code` into a connected shop: exchanges it for tokens, derives shop id,
 * cipher, name, code and region, reads the warehouses and registers the webhooks. The Store is
 * checked first because the code can be exchanged only once.
 */
export const completeAuthorization = async (
  input: AuthorizationInput,
): Promise<AuthorizationResult> => {
  await getTikTokStore();
  const previous = await readState({ fresh: true });

  const tokens = await exchangeAuthCode(input.code);
  const accountClient = buildShopClient(async () => tokens.accessToken);
  const shop = pickShop(await accountClient.shops.getAuthorized(), previous?.tiktokShopId);

  await persistShop(shop, {
    locale: localeOrDefault(input.locale, previous?.tiktokLocale),
    region: input.shopRegion ?? tokens.sellerBaseRegion,
  });
  await saveTokens(tokens, { authorized: true });
  logger.info('TikTok shop authorized', { shopId: shop.id });

  const client = buildShopClient(async () => tokens.accessToken, shop.cipher);
  let warehousesProblem: string | undefined;
  try {
    await refreshWarehouses(client);
  } catch (error) {
    warehousesProblem = 'The warehouses could not be read from TikTok; run the shop config sync';
    logger.warn('Reading TikTok warehouses failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
  const webhooks = await registerWebhooks(client);

  return {
    shopId: shop.id,
    shopName: shop.name ?? shop.id,
    webhooks,
    ...(warehousesProblem ? { warehousesProblem } : {}),
  };
};
