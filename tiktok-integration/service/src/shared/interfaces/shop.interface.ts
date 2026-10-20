/**
 * Interface for shop configuration data
 */
export interface ShopConfigurationData {
  isAuthorized?: boolean;
  isInitialized?: boolean;
  ctSupplyChannelId?: string;
  ctDistributionChannelId?: string;
  ctStoreId?: string;
  ctStoreKey?: string;
  tiktokWarehouseId?: string;
  tiktokWarehouseEntityId?: string;
  shopCipher?: string;
  locale?: string;
  shop_region?: string;
}
