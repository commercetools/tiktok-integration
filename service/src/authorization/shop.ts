import { readConfiguration } from 'tiktok-shared/dist/config';
import { NotAuthorizedError } from 'tiktok-shared/dist/errors';
import { logger } from 'tiktok-shared/dist/logger';
import { writeState } from 'tiktok-shared/dist/state';
import { createTikTokClient, type TikTokClient } from 'tiktok-shared/dist/tiktok/client';

export type AuthorizedShop = Awaited<ReturnType<TikTokClient['shops']['getAuthorized']>>[number];

/** A TikTok warehouse as kept in the `tiktokWarehouses` Store field. */
export interface StoredWarehouse {
  id: string;
  entityId?: string;
  name?: string;
  type?: string;
}

const DEFAULT_LOCALE = 'en';

/** A client for one shop, with explicit token and cipher (the state may not hold them yet). */
export const buildShopClient = (
  getAccessToken: () => Promise<string>,
  shopCipher?: string,
): TikTokClient => {
  const { appKey, appSecret } = readConfiguration().tiktok;
  return createTikTokClient({
    appKey,
    appSecret,
    getAccessToken,
    getShopCipher: async () => {
      if (!shopCipher) {
        throw new NotAuthorizedError('The TikTok shop cipher is not known yet');
      }
      return shopCipher;
    },
  });
};

/**
 * One deployment serves one shop. A seller authorizing several shops keeps the shop already
 * connected when it is still among them, otherwise the first one.
 */
export const pickShop = (
  shops: AuthorizedShop[],
  previousShopId?: string,
): AuthorizedShop & { id: string; cipher: string } => {
  const usable = shops.filter(
    (shop): shop is AuthorizedShop & { id: string; cipher: string } =>
      Boolean(shop.id && shop.cipher),
  );
  if (usable.length === 0) {
    throw new NotAuthorizedError('TikTok returned no authorized shop for this app');
  }
  if (usable.length > 1) {
    logger.warn('More than one TikTok shop is authorized; one deployment serves one shop', {
      shopIds: usable.map((shop) => shop.id),
    });
  }
  return usable.find((shop) => shop.id === previousShopId) ?? usable[0];
};

export const persistShop = async (
  shop: AuthorizedShop & { id: string; cipher: string },
  extra: { locale?: string; region?: string } = {},
): Promise<void> => {
  await writeState({
    tiktokShopId: shop.id,
    tiktokShopCipher: shop.cipher,
    tiktokShopName: shop.name ?? null,
    tiktokShopCode: shop.code ?? null,
    tiktokRegion: shop.region ?? extra.region,
    ...(extra.locale ? { tiktokLocale: extra.locale } : {}),
  });
};

export const refreshWarehouses = async (client: TikTokClient): Promise<StoredWarehouse[]> => {
  const warehouses: StoredWarehouse[] = (await client.warehouses.list())
    .filter((warehouse) => warehouse.id)
    .map((warehouse) => ({
      id: warehouse.id as string,
      ...(warehouse.entityId ? { entityId: warehouse.entityId } : {}),
      ...(warehouse.name ? { name: warehouse.name } : {}),
      ...(warehouse.type ? { type: warehouse.type } : {}),
    }));
  await writeState({ tiktokWarehouses: JSON.stringify(warehouses) });
  return warehouses;
};

/** Tolerant reader of the `tiktokWarehouses` field; unreadable content is an empty list. */
export const parseStoredWarehouses = (raw: string | undefined): StoredWarehouse[] => {
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter(
          (entry): entry is StoredWarehouse =>
            typeof entry === 'object' && entry !== null && typeof entry.id === 'string',
        )
      : [];
  } catch {
    return [];
  }
};

export const localeOrDefault = (locale: string | undefined, previous?: string): string =>
  locale?.trim() || previous || DEFAULT_LOCALE;
