import {
  ByProjectKeyRequestBuilder,
  ProductCreatedMessage,
} from '@commercetools/platform-sdk';
import type { Types } from '../../shared';
import { logger } from '../../utils/logger.utils';

export const productCreated = async (
  apiRoot: ByProjectKeyRequestBuilder,
  shopConfig: Types.ShopConfigurationData,
  message: ProductCreatedMessage,
  productId: string
): Promise<string> => {
  logger.info(
    `New product created: ${productId}. Skipping product creation in Tiktok until product is published.`
  );
  return productId;
};
