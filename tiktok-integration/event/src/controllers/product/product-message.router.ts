import {
  ProductCreatedMessage,
  ProductDeletedMessage,
  ProductPublishedMessage,
  ProductUnpublishedMessage,
} from '@commercetools/platform-sdk';
import { CommercetoolsClient, CommercetoolsStorage, Utils } from '../../shared';
import { logger } from '../../utils/logger.utils';
import { productCreated } from './product-created.controller';
import {
  productDeleted,
  productPublished,
  productUnpublished,
} from './product-state.controller';

export type ProductMessageType =
  | ProductPublishedMessage
  | ProductUnpublishedMessage
  | ProductCreatedMessage
  | ProductDeletedMessage;

export const productMessageHandler = async (
  message: ProductMessageType,
  productId: string
): Promise<string> => {
  const apiRoot = CommercetoolsClient.createApiRoot(Utils.readConfiguration());
  const shopConfiguration =
    await CommercetoolsStorage.ShopConfigController.getShopConfiguration(
      apiRoot
    );

  if (!shopConfiguration || !shopConfiguration.shopCipher) {
    logger.error(
      `Shop configuration not found for product ${productId}. Skipping product update.`
    );
    return productId;
  }
  logger.info(`Getting product ${productId} from commercetools`);

  switch (message.type) {
    case 'ProductCreated':
      return productCreated(apiRoot, shopConfiguration, message, productId);
    case 'ProductPublished':
      return productPublished(apiRoot, shopConfiguration, message, productId);
    case 'ProductUnpublished':
      return productUnpublished(apiRoot, shopConfiguration, message, productId);
    case 'ProductDeleted':
      return productDeleted(apiRoot, shopConfiguration, message, productId);
    // TODO: ProductTailoringCreated, ProductTailoringPublished,
    // TODO: ProductTailoringNameSet, ProductTailoringDescriptionSet
    // TODO: ProductVariantTailoringAdded, ProductTailoringImageAdded
    // ADD variant
    default:
      return productId;
  }
};
