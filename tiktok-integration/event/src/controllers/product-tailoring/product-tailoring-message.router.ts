import {
  ProductTailoringCreatedMessage,
  ProductTailoringDeletedMessage,
  ProductTailoringPublishedMessage,
  ProductTailoringUnpublishedMessage,
} from '@commercetools/platform-sdk';
import { CommercetoolsClient, CommercetoolsStorage, Utils } from '../../shared';
import { logger } from '../../utils/logger.utils';
import { productTailoringCreated } from './product-tailoring-created.controller';
import { productTailoringPublished, productTailoringUnpublished } from './product-tailoring-state.controller';

export type ProductTailoringMessageType =
  | ProductTailoringPublishedMessage
  | ProductTailoringCreatedMessage
  | ProductTailoringDeletedMessage
  | ProductTailoringUnpublishedMessage

export const productTailoringMessageHandler = async (
  message: ProductTailoringMessageType,
  productTailoringId: string
): Promise<string> => {
  const apiRoot = CommercetoolsClient.createApiRoot(Utils.readConfiguration());
  const shopConfiguration =
    await CommercetoolsStorage.ShopConfigController.getShopConfiguration(
      apiRoot
    );

  if (!shopConfiguration || !shopConfiguration.shopCipher) {
    logger.error(
      `Shop configuration not found for product tailoring ${productTailoringId}. Skipping product tailoring update.`
    );
    return productTailoringId;
  }
  const productId = message.product.id;
  const storeKey = message.store.key;

  if (storeKey !== shopConfiguration.ctStoreKey) {
    logger.info(`Product tailoring ${productTailoringId} is not in the same store as the shop configuration. Skipping product tailoring update.`);
    return productTailoringId;
  }
  logger.info(`Getting product ${productId} from commercetools`);

  switch (message.type) {
    case 'ProductTailoringCreated':
      return productTailoringCreated(apiRoot, shopConfiguration, message, productId);
    case 'ProductTailoringPublished':
      return productTailoringPublished(apiRoot, shopConfiguration, message, productId);
    case 'ProductTailoringUnpublished':
    case 'ProductTailoringDeleted':
      return productTailoringUnpublished(apiRoot, shopConfiguration, message, productId);
    default:
      return productTailoringId;
  }
};
