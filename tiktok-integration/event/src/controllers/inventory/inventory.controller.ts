import {
  ByProjectKeyRequestBuilder,
  InventoryEntryCreatedMessage,
  InventoryEntryDeletedMessage,
  InventoryEntryQuantitySetMessage,
} from '@commercetools/platform-sdk';
import {
  CommercetoolsStorage,
  InventoryController,
  Mappers,
  ProductController,
  RouterService,
  Types,
} from '../../shared';
import { logger } from '../../utils/logger.utils';
import { createTiktokProduct } from '../../service/create-tiktok-product';
import { updateTiktokProducts } from '../../service/update-tiktok-product';

export const inventoryEntryCreated = async (
  apiRoot: ByProjectKeyRequestBuilder,
  shopConfiguration: Types.ShopConfigurationData,
  message: InventoryEntryCreatedMessage,
  inventoryEntityid: string
) => {
  try {
    const sku = message.inventoryEntry.sku;

    if (!sku) {
      throw new Error(`No sku found for inventory entry ${inventoryEntityid}`);
    }

    if (
      message.inventoryEntry.supplyChannel?.id !==
      shopConfiguration.ctSupplyChannelId
    ) {
      logger.info(
        `Inventory entry ${inventoryEntityid} is not for the supply channel ${shopConfiguration.ctSupplyChannelId}`
      );
      return inventoryEntityid;
    }

    const products = await ProductController.queryProduct(apiRoot, {
      skus: [sku],
      limit: 1,
    });
    if (!products || !products.length) {
      throw new Error(`No product found for sku ${sku}`);
    }
    const product = products[0];
    const allVariants = [product.masterVariant, ...product.variants];

    const accessToken =
      await CommercetoolsStorage.TokenController.getAccessToken(apiRoot);
    if (!accessToken || !shopConfiguration.shopCipher) {
      throw new Error('No access token or shop cipher found');
    }

    const tiktokProducts = await RouterService.productSearch(
      accessToken,
      shopConfiguration.shopCipher,
      { pageSize: 1 },
      {
        sellerSkus: allVariants.map((variant) => variant.sku),
      }
    );

    const isSkuAlreadyExists = tiktokProducts?.products?.some((product) =>
      product?.skus?.some((sku) => sku?.sellerSku === sku)
    );

    if (!tiktokProducts || !tiktokProducts.products?.length) {
      await createTiktokProduct(
        apiRoot,
        accessToken,
        shopConfiguration,
        product
      );
      return inventoryEntityid;
    } else if (!isSkuAlreadyExists) {
      const tiktokProductIds = tiktokProducts.products!.map(
        (tiktokProduct) => tiktokProduct.id!
      );

      logger.info(
        `Found ${tiktokProductIds.length} tiktok products for product ${product.id}`
      );

      const result = await updateTiktokProducts(
        apiRoot,
        accessToken,
        shopConfiguration,
        tiktokProductIds,
        product
      );
      return result;
    } else {
      for await (const tiktokProduct of tiktokProducts.products) {
        if (!tiktokProduct) {
          continue;
        }
        const inventoryData =
          Mappers.Inventory.mapCommercetoolsInventoryToTiktokInventory(
            shopConfiguration,
            tiktokProduct,
            message.inventoryEntry
          );
        if (inventoryData) {
          await RouterService.updateInventory(
            accessToken,
            shopConfiguration.shopCipher,
            tiktokProduct?.id ?? '',
            inventoryData
          );
        }
      }
      return inventoryEntityid;
    }
  } catch (error: any) {
    logger.error(`Error creating inventory entry ${inventoryEntityid}`, error);
    return inventoryEntityid;
  }
};

export const inventoryEntryQuantitySet = async (
  apiRoot: ByProjectKeyRequestBuilder,
  shopConfiguration: Types.ShopConfigurationData,
  message: InventoryEntryQuantitySetMessage,
  inventoryEntityid: string
): Promise<string> => {
  try {
    const inventory = await InventoryController.getInventorybyId(
      apiRoot,
      inventoryEntityid
    );
    if (!inventory) {
      throw new Error(
        `No inventory found for inventory entry ${inventoryEntityid} in commercetools`
      );
    }
    const sku = inventory.sku;
    if (!sku) {
      throw new Error(`No sku found for inventory entry ${inventoryEntityid}`);
    }

    if (inventory.supplyChannel?.id !== shopConfiguration.ctSupplyChannelId) {
      logger.info(
        `Inventory entry ${inventoryEntityid} is not for the supply channel ${shopConfiguration.ctSupplyChannelId}`
      );
      return inventoryEntityid;
    }

    const products = await ProductController.queryProduct(apiRoot, {
      skus: [sku],
      limit: 1,
    });
    if (!products || !products.length) {
      throw new Error(`No product found for sku ${sku}`);
    }
    const product = products[0];
    const allVariants = [product.masterVariant, ...product.variants];

    const accessToken =
      await CommercetoolsStorage.TokenController.getAccessToken(apiRoot);
    if (!accessToken || !shopConfiguration.shopCipher) {
      throw new Error('No access token or shop cipher found');
    }

    const tiktokProducts = await RouterService.productSearch(
      accessToken,
      shopConfiguration.shopCipher,
      { pageSize: 1 },
      {
        sellerSkus: allVariants.map((variant) => variant.sku),
      }
    );

    const isSkuAlreadyExists = tiktokProducts?.products?.some((product) =>
      product?.skus?.some((sku) => sku?.sellerSku === sku)
    );

    if (!tiktokProducts || !tiktokProducts.products?.length) {
      await createTiktokProduct(
        apiRoot,
        accessToken,
        shopConfiguration,
        product
      );
      return inventoryEntityid;
    } else if (!isSkuAlreadyExists) {
      const tiktokProductIds = tiktokProducts.products!.map(
        (tiktokProduct) => tiktokProduct.id!
      );

      logger.info(
        `Found ${tiktokProductIds.length} tiktok products for product ${product.id}`
      );

      const result = await updateTiktokProducts(
        apiRoot,
        accessToken,
        shopConfiguration,
        tiktokProductIds,
        product
      );
      return result;
    } else {
      for await (const tiktokProduct of tiktokProducts.products) {
        if (!tiktokProduct) {
          continue;
        }
        const inventoryData =
          Mappers.Inventory.mapCommercetoolsInventoryToTiktokInventory(
            shopConfiguration,
            tiktokProduct,
            inventory
          );
        if (inventoryData) {
          await RouterService.updateInventory(
            accessToken,
            shopConfiguration.shopCipher,
            tiktokProduct?.id ?? '',
            inventoryData
          );
        }
      }
      return inventoryEntityid;
    }
  } catch (error: any) {
    logger.error(`Error creating inventory entry ${inventoryEntityid}`, error);
    return inventoryEntityid;
  }
};

export const inventoryEntryDeleted = async (
  apiRoot: ByProjectKeyRequestBuilder,
  shopConfiguration: Types.ShopConfigurationData,
  message: InventoryEntryDeletedMessage,
  inventoryEntityid: string
): Promise<string> => {
  try {
    const sku = message.sku;
    if (!sku) {
      throw new Error(`No sku found for inventory entry ${inventoryEntityid}`);
    }

    if (message.supplyChannel?.id !== shopConfiguration.ctSupplyChannelId) {
      logger.info(
        `Inventory entry ${inventoryEntityid} is not for the supply channel ${shopConfiguration.ctSupplyChannelId}`
      );
      return inventoryEntityid;
    }

    const accessToken =
      await CommercetoolsStorage.TokenController.getAccessToken(apiRoot);
    if (!accessToken || !shopConfiguration.shopCipher) {
      throw new Error('No access token or shop cipher found');
    }

    const tiktokProducts = await RouterService.productSearch(
      accessToken,
      shopConfiguration.shopCipher,
      { pageSize: 1 },
      {
        sellerSkus: [sku],
      }
    );

    if (tiktokProducts && !!tiktokProducts.products?.length) {
      for await (const tiktokProduct of tiktokProducts.products) {
        if (!tiktokProduct) {
          continue;
        }
        const inventoryData =
          Mappers.Inventory.mapCommercetoolsInventoryToTiktokInventory(
            shopConfiguration,
            tiktokProduct,
            {
              availableQuantity: 0,
              sku: sku,
            }
          );
        if (inventoryData) {
          await RouterService.updateInventory(
            accessToken,
            shopConfiguration.shopCipher,
            tiktokProduct?.id ?? '',
            inventoryData
          );
        }
      }
    }
    return inventoryEntityid;
  } catch (error: any) {
    logger.error(`Error creating inventory entry ${inventoryEntityid}`, error);
    return inventoryEntityid;
  }
};
