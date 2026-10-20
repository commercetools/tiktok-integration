import { InventoryEntry } from '@commercetools/platform-sdk';
import {
  Product202309UpdateInventoryRequestBody,
  Product202502SearchProductsResponseDataProducts,
} from '../../interfaces/tiktok/models';
import { ShopConfigurationData } from '../../interfaces';

export const mapCommercetoolsInventoryToTiktokInventory = (
  shopConfig: ShopConfigurationData,
  tiktokProduct?: Product202502SearchProductsResponseDataProducts | null,
  inventoryEntry?: Pick<InventoryEntry, 'sku' | 'availableQuantity'>
): Product202309UpdateInventoryRequestBody | undefined => {
  if (!tiktokProduct || !inventoryEntry) {
    return undefined;
  }
  const tikTokSku = tiktokProduct.skus?.find(
    (sku) => sku.sellerSku === inventoryEntry.sku
  );
  if (!tikTokSku) {
    return undefined;
  }
  return {
    skus: [
      {
        id: tikTokSku.id,
        inventory: [
          {
            quantity: inventoryEntry.availableQuantity,
            warehouseId: shopConfig.tiktokWarehouseId,
          },
        ],
      },
    ],
  };
};
