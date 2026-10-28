/**
 * Everything the mappers need to know about the connected TikTok shop,
 * resolved from the Store state and the TikTok warehouse/price channels.
 */
export interface ShopContext {
  /** commercetools locale used for localized strings, e.g. `en-US`. */
  locale: string;
  /** Upper/lower case ISO country code of the TikTok shop, e.g. `US`. */
  shopRegion?: string;
  ctSupplyChannelId: string;
  ctDistributionChannelId?: string;
  tiktokWarehouseId: string;
  tiktokWarehouseEntityId?: string;
}
