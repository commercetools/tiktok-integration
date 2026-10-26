import type {
  ProductTailoringDeletedMessage,
  ProductTailoringPublishedMessage,
  ProductTailoringUnpublishedMessage,
} from '@commercetools/platform-sdk';
import { logger } from '../../../shared/logger';
import { getStoreProjection } from '../commercetools';
import { syncProduct, type SyncContext } from '../tiktok-products';
import { publishProduct, unpublishProduct } from './product';

export type ProductTailoringMessage =
  | ProductTailoringPublishedMessage
  | ProductTailoringUnpublishedMessage
  | ProductTailoringDeletedMessage;

export const handleProductTailoringMessage = async (
  context: SyncContext,
  message: ProductTailoringMessage,
): Promise<void> => {
  if (message.store.key !== context.storeKey) {
    logger.info(
      `Product tailoring is for store ${message.store.key}, not ${context.storeKey}; ignoring`,
    );
    return;
  }
  const productId = message.product.id;

  if (message.type === 'ProductTailoringPublished') {
    await publishProduct(context, productId);
    return;
  }

  // Tailoring removed: the store projection falls back to the untailored product. If the
  // product is no longer available in the store at all, the listing is deactivated instead.
  const projection = await getStoreProjection(
    context.apiRoot,
    context.storeKey,
    productId,
  );
  if (projection) {
    await syncProduct(context, projection);
  } else {
    await unpublishProduct(context, productId);
  }
};
