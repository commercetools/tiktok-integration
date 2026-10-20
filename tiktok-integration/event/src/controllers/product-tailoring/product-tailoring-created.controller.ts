import {
  ByProjectKeyRequestBuilder,
  ProductTailoringCreatedMessage
} from '@commercetools/platform-sdk';
import type { Types } from '../../shared';
import { logger } from '../../utils/logger.utils';

export const productTailoringCreated = async (
  apiRoot: ByProjectKeyRequestBuilder,
  shopConfig: Types.ShopConfigurationData,
  message: ProductTailoringCreatedMessage,
  productId: string
): Promise<string> => {
  logger.info(
    `New product tailoring created: ${productId}. Skipping product tailoring creation in Tiktok until product tailoring is published.`
  );
  return productId;
};
