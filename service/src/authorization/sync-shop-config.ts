import { getValidAccessToken, readState } from 'tiktok-shared/dist/state';
import { NotAuthorizedError } from 'tiktok-shared/dist/errors';
import { buildShopClient, persistShop, pickShop, refreshWarehouses } from './shop';

export interface ShopConfigSyncResult {
  shopId: string;
  warehouses: number;
}

/** Re-reads shop identity and warehouses from TikTok and stores them. Needs an authorized shop. */
export const syncShopConfig = async (): Promise<ShopConfigSyncResult> => {
  const state = await readState({ fresh: true });
  if (!state?.tiktokShopId) {
    throw new NotAuthorizedError();
  }
  const account = buildShopClient(getValidAccessToken);
  const shop = pickShop(await account.shops.getAuthorized(), state.tiktokShopId);
  await persistShop(shop);
  const warehouses = await refreshWarehouses(buildShopClient(getValidAccessToken, shop.cipher));
  return { shopId: shop.id, warehouses: warehouses.length };
};
