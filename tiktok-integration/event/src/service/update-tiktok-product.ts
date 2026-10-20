import {
  ByProjectKeyRequestBuilder,
  ProductProjection,
} from '@commercetools/platform-sdk';
import { logger } from '../utils/logger.utils';
import { Mappers, RouterService, Types } from '../shared';

export const updateTiktokProducts = async (
  apiRoot: ByProjectKeyRequestBuilder,
  accessToken: string,
  shopConfiguration: Types.ShopConfigurationData,
  tiktokProductIds: string[],
  product: ProductProjection
) => {
  const tiktokProductsData = await RouterService.getProductsByIds(
    accessToken,
    shopConfiguration.shopCipher!,
    tiktokProductIds,
    {
      draft: false,
      locale: shopConfiguration.locale,
    }
  );
  if (!tiktokProductsData || !tiktokProductsData.length) {
    throw new Error(`No tiktok product found for product ${product.id}`);
  }
  await Promise.all(
    tiktokProductsData
      .filter((tiktokProductData) => typeof tiktokProductData !== 'undefined')
      .map(async (tiktokProductData) => {
        const merged =
          await Mappers.Product.mergeTiktokProductAndCommercetoolsProductToTiktokProductEdit(
            apiRoot,
            tiktokProductData,
            product
          );
        return RouterService.publishProduct(
          accessToken,
          shopConfiguration.shopCipher!,
          tiktokProductData.id!,
          merged
        );
      })
  ).catch((error) => {
    logger.error(
      `Error updating tiktok products for product ${product.id}`,
      error
    );
  });

  logger.info(
    `Merged and updated ${tiktokProductsData.length} tiktok products for product ${product.id}`
  );
  return product.id;
};
