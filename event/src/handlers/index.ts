import { logger } from '../../../shared/logger';
import type { SubscriptionMessage } from '../envelope';
import { createSyncContext } from '../tiktok-products';
import { handleInventoryMessage, type InventoryMessage } from './inventory';
import { handleProductMessage, type ProductMessage } from './product';
import {
  handleProductTailoringMessage,
  type ProductTailoringMessage,
} from './product-tailoring';

/**
 * Routes a subscription message to its handler. The message only identifies the resource;
 * every handler re-fetches current state, so redelivered or reordered messages converge.
 */
export const handleMessage = async (
  message: SubscriptionMessage,
): Promise<void> => {
  const { typeId, id } = message.resource;
  switch (typeId) {
    case 'product':
      await handleProductMessage(
        await createSyncContext(),
        message as unknown as ProductMessage,
        id,
      );
      break;
    case 'inventory-entry':
      await handleInventoryMessage(
        await createSyncContext(),
        message as unknown as InventoryMessage,
        id,
      );
      break;
    case 'product-tailoring':
      await handleProductTailoringMessage(
        await createSyncContext(),
        message as unknown as ProductTailoringMessage,
      );
      break;
    default:
      logger.info(`Ignoring message for resource type ${typeId}`);
  }
};
