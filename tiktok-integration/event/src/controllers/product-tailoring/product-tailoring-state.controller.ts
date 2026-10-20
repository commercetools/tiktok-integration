import {
  ByProjectKeyRequestBuilder,
  ProductTailoringDeletedMessage,
  ProductTailoringPublishedMessage,
  ProductTailoringUnpublishedMessage,
} from '@commercetools/platform-sdk';
import { createTiktokProduct } from '../../service/create-tiktok-product';
import { updateTiktokProducts } from '../../service/update-tiktok-product';
import type { Types } from '../../shared';
import {
  CommercetoolsStorage,
  ProductController,
  RouterService,
} from '../../shared';
import { logger } from '../../utils/logger.utils';
import {
  productUnpublished,
} from '../product/product-state.controller';

export const productTailoringPublished = async (
  apiRoot: ByProjectKeyRequestBuilder,
  shopConfiguration: Types.ShopConfigurationData,
  message: ProductTailoringPublishedMessage,
  productId: string
): Promise<string> => {
  try {
    const product = await ProductController.getProduct(
      apiRoot,
      productId,
      shopConfiguration
    );
    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

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
    logger.error(`Error publishing product tailoring ${productId}`, error);
    return productId;
  }
};

export const productTailoringUnpublished = async (
  apiRoot: ByProjectKeyRequestBuilder,
  shopConfiguration: Types.ShopConfigurationData,
  message: ProductTailoringUnpublishedMessage | ProductTailoringDeletedMessage,
  productId: string
): Promise<string> => {
  try {
    const productProjection = await ProductController.getProduct(
      apiRoot,
      productId,
      shopConfiguration
    );
    if (!productProjection) {
      // whole product is unpublished
      const result = await productUnpublished(
        apiRoot,
        shopConfiguration,
        message,
        productId
      );
      return result;
    }
    // product tailoring is unpublished, then use product projection instead
    logger.info(`Product ${productProjection.id} published`);

    const accessToken =
      await CommercetoolsStorage.TokenController.getAccessToken(apiRoot);
    if (!accessToken || !shopConfiguration.shopCipher) {
      throw new Error('No access token or shop cipher found');
    }

    const variantSKUs = [
      productProjection.masterVariant,
      ...productProjection.variants,
    ]
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
        productProjection
      );
      return productId;
    } else {
      const tiktokProductIds = tiktokProducts.products!.map(
        (tiktokProduct) => tiktokProduct.id!
      );

      logger.info(
        `Found ${tiktokProductIds.length} tiktok products for product ${productProjection.id}`
      );

      const result = await updateTiktokProducts(
        apiRoot,
        accessToken,
        shopConfiguration,
        tiktokProductIds,
        productProjection
      );
      return result;
    }
  } catch (error) {
    logger.error(`Error unpublishing product tailoring ${productId}`, error);
    return productId;
  }
};