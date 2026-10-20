import {
  InventoryEntryCreatedMessage,
  InventoryEntryDeletedMessage,
  InventoryEntryQuantitySetMessage,
} from '@commercetools/platform-sdk';
import { CommercetoolsClient, CommercetoolsStorage, Utils } from '../../shared';
import { logger } from '../../utils/logger.utils';
import {
  inventoryEntryCreated,
  inventoryEntryDeleted,
  inventoryEntryQuantitySet,
} from './inventory.controller';

export type InventoryEntryMessageType =
  | InventoryEntryCreatedMessage
  | InventoryEntryQuantitySetMessage
  | InventoryEntryDeletedMessage;

export const inventoryEntryMessageHandler = async (
  message: InventoryEntryMessageType,
  inventoryEntityid: string
): Promise<string> => {
  const apiRoot = CommercetoolsClient.createApiRoot(Utils.readConfiguration());
  const shopConfiguration =
    await CommercetoolsStorage.ShopConfigController.getShopConfiguration(
      apiRoot
    );

  if (!shopConfiguration || !shopConfiguration.shopCipher) {
    logger.error(
      `Shop configuration not found for inventory entity ${inventoryEntityid}. Skipping inventory entry update.`
    );
    return inventoryEntityid;
  }

  switch (message.type) {
    case 'InventoryEntryCreated':
      return inventoryEntryCreated(
        apiRoot,
        shopConfiguration,
        message,
        inventoryEntityid
      );
    case 'InventoryEntryQuantitySet':
      return inventoryEntryQuantitySet(
        apiRoot,
        shopConfiguration,
        message,
        inventoryEntityid
      );
    case 'InventoryEntryDeleted':
      return inventoryEntryDeleted(
        apiRoot,
        shopConfiguration,
        message,
        inventoryEntityid
      );

    default:
      return inventoryEntityid;
  }
};
