import { logger } from '../utils/logger.utils';
import {
  inventoryEntryMessageHandler,
  InventoryEntryMessageType,
} from './inventory/inventory-message.router';
import { productTailoringMessageHandler, ProductTailoringMessageType } from './product-tailoring/product-tailoring-message.router';
import {
  ProductMessageType,
  productMessageHandler,
} from './product/product-message.router';



export const resourceMessage = async (
  message: ProductMessageType | InventoryEntryMessageType | ProductTailoringMessageType
) => {
  const { resource } = message;
  const { typeId, id } = resource;
  if (typeId === 'product') {
    const product = await productMessageHandler(
      message as ProductMessageType,
      id
    );
    logger.info(product);
  }
  if (typeId === 'inventory-entry') {
    const inventoryEntityid = await inventoryEntryMessageHandler(
      message as InventoryEntryMessageType,
      id
    );
    logger.info(inventoryEntityid);
  }
  if (typeId === 'product-tailoring') {
    const productTailoringId = await productTailoringMessageHandler(
      message as ProductTailoringMessageType,
      id
    );
    logger.info(productTailoringId);
  }
};
