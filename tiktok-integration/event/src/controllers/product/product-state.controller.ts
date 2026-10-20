import {
  ByProjectKeyRequestBuilder,
  ProductDeletedMessage,
  ProductPublishedMessage,
  ProductTailoringDeletedMessage,
  ProductTailoringUnpublishedMessage,
  ProductUnpublishedMessage,
} from '@commercetools/platform-sdk';
import type { Types } from '../../shared';
import {
  CommercetoolsStorage,
  ProductController,
  RouterService,
} from '../../shared';
import { logger } from '../../utils/logger.utils';
import { createTiktokProduct } from '../../service/create-tiktok-product';
import { updateTiktokProducts } from '../../service/update-tiktok-product';

export const productPublished = async (
  apiRoot: ByProjectKeyRequestBuilder,
  shopConfiguration: Types.ShopConfigurationData,
  message: ProductPublishedMessage,
  productId: string
): Promise<string> => {
  try {
    const product = message.productProjection;
    logger.info(`Product ${product.id} published`);

    const accessToken =
      await CommercetoolsStorage.TokenController.getAccessToken(apiRoot);
    if (!accessToken || !shopConfiguration.shopCipher) {
      throw new Error('No access token or shop cipher found');
    }

    const variantSKUs = [product.masterVariant, ...product.variants]
      .map((variant) => variant.sku)
      .filter((sku) => typeof sku !== 'undefined');
    if (!variantSKUs || !variantSKUs.length) {
      throw new Error(`No variants found for product ${productId}`);
    }
    const tiktokProducts = await RouterService.productSearch(
      accessToken,
      shopConfiguration.shopCipher,
      { pageSize: variantSKUs.length },
      {
        sellerSkus: variantSKUs,
      }
    );

    if (!tiktokProducts || !tiktokProducts.products?.length) {
      await createTiktokProduct(
        apiRoot,
        accessToken,
        shopConfiguration,
        product
      );
      return productId;
    } else {
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
    }
  } catch (error: any) {
    logger.error(`Error publishing product ${productId}`, error);
    return productId;
  }
};

export const productUnpublished = async (
  apiRoot: ByProjectKeyRequestBuilder,
  shopConfiguration: Types.ShopConfigurationData,
  message: ProductUnpublishedMessage | ProductTailoringUnpublishedMessage | ProductTailoringDeletedMessage,
  productId: string
): Promise<string> => {
  try {
    logger.info(`Product ${productId} unpublished`);

    const accessToken =
      await CommercetoolsStorage.TokenController.getAccessToken(apiRoot);
    if (!accessToken || !shopConfiguration.shopCipher) {
      throw new Error('No access token or shop cipher found');
    }

    const product = await ProductController.getUnpublishedProduct(
      apiRoot,
      productId
    );
    if (!product) {
      throw new Error(`Product ${productId} not found in commercetools`);
    }
    const variantSKUs = [
      product.masterData.current.masterVariant,
      ...product.masterData.current.variants,
    ]
      .map((variant) => variant.sku)
      .filter((sku) => typeof sku !== 'undefined');
    if (!variantSKUs || !variantSKUs.length) {
      throw new Error(`No variants found for product ${productId}`);
    }
    const tiktokProductIds = [];
    const tiktokProducts = await RouterService.productSearch(
      accessToken,
      shopConfiguration.shopCipher,
      { pageSize: variantSKUs.length },
      {
        sellerSkus: variantSKUs,
      }
    );

    if (!tiktokProducts || !tiktokProducts.products?.length) {
      logger.info(
        `No tiktok products found for product ${productId}. Nothing to do.`
      );
      return productId;
    } else {
      tiktokProductIds.push(
        ...tiktokProducts.products.map((tiktokProduct) => tiktokProduct.id!)
      );
      logger.info(
        `Found ${tiktokProductIds} tiktok products for product ${productId}`
      );

      await RouterService.deactivateProducts(
        accessToken,
        shopConfiguration.shopCipher!,
        tiktokProductIds
      );

      logger.info(
        `Deactivated ${tiktokProductIds} tiktok products for product ${productId}`
      );
      return productId;
    }
  } catch (error) {
    logger.error(`Error unpublishing product ${productId}`, error);
    return productId;
  }
};

export const productDeleted = async (
  apiRoot: ByProjectKeyRequestBuilder,
  shopConfiguration: Types.ShopConfigurationData,
  message: ProductDeletedMessage,
  productId: string
): Promise<string> => {
  try {
    logger.info(`Product ${productId} unpublished`);

    const accessToken =
      await CommercetoolsStorage.TokenController.getAccessToken(apiRoot);
    if (!accessToken || !shopConfiguration.shopCipher) {
      throw new Error('No access token or shop cipher found');
    }

    const product = message.currentProjection;
    if (!product) {
      throw new Error(`Product ${productId} not found in commercetools`);
    }
    const variantSKUs = [product.masterVariant, ...product.variants]
      .map((variant) => variant.sku)
      .filter((sku) => typeof sku !== 'undefined');
    if (!variantSKUs || !variantSKUs.length) {
      throw new Error(`No variants found for product ${productId}`);
    }
    const tiktokProductIds = [];
    const tiktokProducts = await RouterService.productSearch(
      accessToken,
      shopConfiguration.shopCipher,
      { pageSize: variantSKUs.length },
      {
        sellerSkus: variantSKUs,
      }
    );

    if (!tiktokProducts || !tiktokProducts.products?.length) {
      logger.info(
        `No tiktok products found for product ${productId}. Nothing to do.`
      );
      return productId;
    } else {
      tiktokProductIds.push(
        ...tiktokProducts.products.map((tiktokProduct) => tiktokProduct.id!)
      );
      logger.info(
        `Found ${tiktokProductIds} tiktok products for product ${productId}`
      );

      await RouterService.deleteProducts(
        accessToken,
        shopConfiguration.shopCipher!,
        tiktokProductIds
      );
      logger.info(
        `Deleted ${tiktokProductIds} tiktok products for product ${productId}`
      );
      return productId;
    }
  } catch (error) {
    logger.error(`Error unpublishing product ${productId}`, error);
    return productId;
  }
};
