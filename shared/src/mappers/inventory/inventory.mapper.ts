import type { InventoryEntry } from '@commercetools/platform-sdk';
import type {
  Product202309UpdateInventoryRequestBody,
  Product202502SearchProductsResponseDataProducts,
} from '../../../tiktok-sdk';
import type { ShopContext } from '../../interfaces';

export const mapCommercetoolsInventoryToTiktokInventory = (
  shop: Pick<ShopContext, 'tiktokWarehouseId'>,
  tiktokProduct?: Product202502SearchProductsResponseDataProducts | null,
  inventoryEntry?: Pick<InventoryEntry, 'sku' | 'availableQuantity'>,
): Product202309UpdateInventoryRequestBody | undefined => {
  if (!tiktokProduct || !inventoryEntry) {
    return undefined;
  }
  const tikTokSku = tiktokProduct.skus?.find(
    (sku) => sku.sellerSku === inventoryEntry.sku,
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
            warehouseId: shop.tiktokWarehouseId,
          },
        ],
      },
    ],
  };
};
