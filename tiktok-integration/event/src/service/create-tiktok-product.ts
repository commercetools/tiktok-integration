import {
  ByProjectKeyRequestBuilder,
  ProductProjection,
} from '@commercetools/platform-sdk';
import { Mappers, RouterService, Types } from '../shared';
import { logger } from '../utils/logger.utils';

export const createTiktokProduct = async (
  apiRoot: ByProjectKeyRequestBuilder,
  accessToken: string,
  shopConfiguration: Types.ShopConfigurationData,
  product: ProductProjection
) => {
  try {
    const productDraft =
      await Mappers.Product.commercetoolsProductToTiktokProduct(
        apiRoot,
        product
      );
    const allVariants = [product.masterVariant, ...product.variants];
    const productImages = allVariants
      .map((variant) => variant.images?.map((image) => image.url) ?? [])
      .flat();
    await RouterService.createProduct(
      accessToken,
      shopConfiguration.shopCipher!,
      productDraft,
      productImages
    );
  } catch (error) {
    logger.error(`Error creating product draft for product ${product.id}`);
  }
};
