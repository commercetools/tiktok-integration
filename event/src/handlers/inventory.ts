import type {
  InventoryEntry,
  InventoryEntryCreatedMessage,
  InventoryEntryDeletedMessage,
  InventoryEntryQuantitySetMessage,
} from '@commercetools/platform-sdk';
import * as Mappers from 'tiktok-shared/dist/src/mappers';
import { logger } from 'tiktok-shared/dist/src/logger';
import { findStoreProjectionBySku, getInventoryEntry } from '../commercetools';
import {
  findTiktokProductsBySkus,
  syncProduct,
  variantSkus,
  type SyncContext,
  type TiktokListing,
} from '../tiktok-products';

export type InventoryMessage =
  | InventoryEntryCreatedMessage
  | InventoryEntryQuantitySetMessage
  | InventoryEntryDeletedMessage;

type StockLevel = Pick<InventoryEntry, 'sku' | 'availableQuantity'>;

const pushStock = async (
  { client, shop }: SyncContext,
  listings: TiktokListing[],
  stock: StockLevel,
): Promise<void> => {
  for (const listing of listings) {
    const body = Mappers.Inventory.mapCommercetoolsInventoryToTiktokInventory(
      shop,
      listing,
      stock,
    );
    if (body && listing.id) {
      await client.inventory.update(listing.id, body);
    }
  }
};

const syncInventoryEntry = async (
  context: SyncContext,
  entry: InventoryEntry,
): Promise<void> => {
  if (entry.supplyChannel?.id !== context.shop.ctSupplyChannelId) {
    logger.info(
      `Inventory entry ${entry.id} is not for the TikTok supply channel; ignoring`,
    );
    return;
  }
  const product = await findStoreProjectionBySku(
    context.apiRoot,
    context.storeKey,
    entry.sku,
  );
  if (!product) {
    logger.info(
      `No product in store ${context.storeKey} has SKU of inventory entry ${entry.id}; ignoring`,
    );
    return;
  }

  const listings = await findTiktokProductsBySkus(context, variantSkus(product));
  const hasSku = listings.some((listing) =>
    listing.skus?.some((sku) => sku.sellerSku === entry.sku),
  );
  if (listings.length === 0 || !hasSku) {
    // The SKU is not on TikTok yet: syncing the product creates or extends the listing.
    await syncProduct(context, product, listings);
    return;
  }
  await pushStock(context, listings, entry);
};

export const handleInventoryMessage = async (
  context: SyncContext,
  message: InventoryMessage,
  inventoryEntryId: string,
): Promise<void> => {
  switch (message.type) {
    case 'InventoryEntryCreated':
    case 'InventoryEntryQuantitySet': {
      const entry = await getInventoryEntry(context.apiRoot, inventoryEntryId);
      if (!entry) {
        logger.info(`Inventory entry ${inventoryEntryId} no longer exists; ignoring`);
        return;
      }
      await syncInventoryEntry(context, entry);
      break;
    }
    case 'InventoryEntryDeleted': {
      if (message.supplyChannel?.id !== context.shop.ctSupplyChannelId) {
        return;
      }
      const listings = await findTiktokProductsBySkus(context, [message.sku]);
      await pushStock(context, listings, {
        sku: message.sku,
        availableQuantity: 0,
      });
      break;
    }
  }
};
