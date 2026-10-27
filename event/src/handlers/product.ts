import type {
  ProductDeletedMessage,
  ProductPublishedMessage,
  ProductUnpublishedMessage,
} from '@commercetools/platform-sdk';
import { logger } from 'tiktok-shared/dist/src/logger';
import { getProduct, getStoreProjection } from '../commercetools';
import {
  removeTiktokProducts,
  syncProduct,
  variantSkus,
  type SyncContext,
} from '../tiktok-products';

export type ProductMessage =
  | ProductPublishedMessage
  | ProductUnpublishedMessage
  | ProductDeletedMessage;

/** Re-fetches the product as the TikTok store sees it and syncs it. */
export const publishProduct = async (
  context: SyncContext,
  productId: string,
): Promise<void> => {
  const projection = await getStoreProjection(
    context.apiRoot,
    context.storeKey,
    productId,
  );
  if (!projection) {
    logger.info(
      `Product ${productId} is not published in store ${context.storeKey}; nothing to sync`,
    );
    return;
  }
  await syncProduct(context, projection);
};

export const unpublishProduct = async (
  context: SyncContext,
  productId: string,
): Promise<void> => {
  const product = await getProduct(context.apiRoot, productId);
  if (!product) {
    logger.info(`Product ${productId} no longer exists; nothing to deactivate`);
    return;
  }
  const { masterVariant, variants } = product.masterData.current;
  await removeTiktokProducts(
    context,
    variantSkus({ masterVariant, variants }),
    'deactivate',
  );
};

export const handleProductMessage = async (
  context: SyncContext,
  message: ProductMessage,
  productId: string,
): Promise<void> => {
  switch (message.type) {
    case 'ProductPublished':
      await publishProduct(context, productId);
      break;
    case 'ProductUnpublished':
      await unpublishProduct(context, productId);
      break;
    case 'ProductDeleted':
      if (!message.currentProjection) {
        logger.warn(
          `Product ${productId} was deleted without its projection; its TikTok listings are left untouched`,
        );
        return;
      }
      await removeTiktokProducts(
        context,
        variantSkus(message.currentProjection),
        'delete',
      );
      break;
  }
};
