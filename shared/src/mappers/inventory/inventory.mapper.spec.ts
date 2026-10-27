import type { Product202502SearchProductsResponseDataProducts } from '../../../tiktok-sdk';
import { mapCommercetoolsInventoryToTiktokInventory } from './inventory.mapper';

const tiktokProduct = {
  skus: [{ id: 'tt-sku-1', sellerSku: 'SKU-1' }],
} as Product202502SearchProductsResponseDataProducts;

describe('mapCommercetoolsInventoryToTiktokInventory', () => {
  it('builds an inventory update for the matching seller sku', () => {
    expect(
      mapCommercetoolsInventoryToTiktokInventory(
        { tiktokWarehouseId: 'wh-1' },
        tiktokProduct,
        { sku: 'SKU-1', availableQuantity: 7 },
      ),
    ).toEqual({
      skus: [
        { id: 'tt-sku-1', inventory: [{ quantity: 7, warehouseId: 'wh-1' }] },
      ],
    });
  });

  it('returns undefined without a product, entry or matching sku', () => {
    const shop = { tiktokWarehouseId: 'wh-1' };
    expect(
      mapCommercetoolsInventoryToTiktokInventory(shop, null, {
        sku: 'SKU-1',
        availableQuantity: 1,
      }),
    ).toBeUndefined();
    expect(
      mapCommercetoolsInventoryToTiktokInventory(
        shop,
        tiktokProduct,
        undefined,
      ),
    ).toBeUndefined();
    expect(
      mapCommercetoolsInventoryToTiktokInventory(shop, tiktokProduct, {
        sku: 'OTHER',
        availableQuantity: 1,
      }),
    ).toBeUndefined();
  });
});
