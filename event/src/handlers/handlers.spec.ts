import type { ProductProjection } from '@commercetools/platform-sdk';
import * as Mappers from 'tiktok-shared/dist/src/mappers';
import {
  findStoreProjectionBySku,
  getInventoryEntry,
  getProduct,
  getStoreProjection,
} from '../commercetools';
import type { SyncContext } from '../tiktok-products';
import { handleInventoryMessage } from './inventory';
import { handleProductMessage } from './product';
import { handleProductTailoringMessage } from './product-tailoring';

jest.mock('../commercetools');
jest.mock('tiktok-shared/dist/src/mappers', () => ({
  Product: {
    commercetoolsProductToTiktokProduct: jest.fn(),
    mergeTiktokProductAndCommercetoolsProductToTiktokProductEdit: jest.fn(),
  },
  Inventory: { mapCommercetoolsInventoryToTiktokInventory: jest.fn() },
}));
jest.mock('tiktok-shared/dist/src/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mappers = jest.mocked(Mappers, { shallow: false });

const projection = (
  sku = 'sku-1',
  images = [{ url: 'https://img/a.jpg' }],
): ProductProjection =>
  ({
    id: 'p-1',
    masterVariant: { id: 1, sku, images },
    variants: [],
  }) as unknown as ProductProjection;

const client = {
  products: {
    search: jest.fn(),
    create: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
    deactivate: jest.fn(),
    delete: jest.fn(),
  },
  images: { upload: jest.fn() },
  inventory: { update: jest.fn() },
};

const context = {
  apiRoot: {},
  storeKey: 'tiktok-store',
  shop: { locale: 'en-US', ctSupplyChannelId: 'channel-1', tiktokWarehouseId: 'wh-1' },
  client,
} as unknown as SyncContext;

const listing = { id: 't-1', skus: [{ sellerSku: 'sku-1' }] };

beforeEach(() => {
  client.products.search.mockResolvedValue({ products: [] });
  client.images.upload.mockResolvedValue({ uri: 'tos://img' });
  client.products.get.mockResolvedValue({ id: 't-1' });
  mappers.Product.commercetoolsProductToTiktokProduct.mockResolvedValue({ title: 'draft' });
  mappers.Product.mergeTiktokProductAndCommercetoolsProductToTiktokProductEdit.mockResolvedValue({ title: 'edit' });
  mappers.Inventory.mapCommercetoolsInventoryToTiktokInventory.mockReturnValue({ skus: [] });
});

describe('product messages', () => {
  const published = { type: 'ProductPublished' } as never;

  it('creates the TikTok product, with uploaded images, when no listing carries its SKUs', async () => {
    jest.mocked(getStoreProjection).mockResolvedValue(projection());
    await handleProductMessage(context, published, 'p-1');
    expect(client.products.search).toHaveBeenCalledWith({ sellerSkus: ['sku-1'] }, { pageSize: 1 });
    expect(client.images.upload).toHaveBeenCalledWith('https://img/a.jpg');
    expect(client.products.create).toHaveBeenCalledWith({ title: 'draft', mainImages: [{ uri: 'tos://img' }] });
  });

  it('updates existing listings instead of creating, so a redelivered message is harmless', async () => {
    jest.mocked(getStoreProjection).mockResolvedValue(projection());
    client.products.search.mockResolvedValue({ products: [listing] });
    await handleProductMessage(context, published, 'p-1');
    await handleProductMessage(context, published, 'p-1');
    expect(client.products.create).not.toHaveBeenCalled();
    expect(client.products.update).toHaveBeenCalledTimes(2);
    expect(client.products.update).toHaveBeenCalledWith('t-1', { title: 'edit' });
  });

  it('does nothing when the product is not available in the TikTok store', async () => {
    jest.mocked(getStoreProjection).mockResolvedValue(undefined);
    await handleProductMessage(context, published, 'p-1');
    expect(client.products.search).not.toHaveBeenCalled();
  });

  it('refuses to create a listing without images', async () => {
    jest.mocked(getStoreProjection).mockResolvedValue(projection('sku-1', []));
    await expect(handleProductMessage(context, published, 'p-1')).rejects.toThrow(/no images/);
    expect(client.products.create).not.toHaveBeenCalled();
  });

  it('deactivates the TikTok listings of an unpublished product', async () => {
    jest.mocked(getProduct).mockResolvedValue({
      masterData: { current: { masterVariant: { sku: 'sku-1' }, variants: [] } },
    } as never);
    client.products.search.mockResolvedValue({ products: [listing] });
    await handleProductMessage(context, { type: 'ProductUnpublished' } as never, 'p-1');
    expect(client.products.deactivate).toHaveBeenCalledWith(['t-1']);
  });

  it('deletes the TikTok listings of a deleted product, using the projection in the message', async () => {
    client.products.search.mockResolvedValue({ products: [listing] });
    await handleProductMessage(
      context,
      { type: 'ProductDeleted', currentProjection: projection() } as never,
      'p-1',
    );
    expect(client.products.delete).toHaveBeenCalledWith(['t-1']);
  });

  it('leaves TikTok alone when a deleted product message has no projection', async () => {
    await handleProductMessage(context, { type: 'ProductDeleted' } as never, 'p-1');
    expect(client.products.search).not.toHaveBeenCalled();
  });
});

describe('product tailoring messages', () => {
  const tailoring = (type: string, storeKey = 'tiktok-store') =>
    ({ type, store: { key: storeKey }, product: { id: 'p-1' } }) as never;

  it('ignores tailoring of other stores', async () => {
    await handleProductTailoringMessage(context, tailoring('ProductTailoringPublished', 'other'));
    expect(getStoreProjection).not.toHaveBeenCalled();
  });

  it('syncs the untailored projection when a tailoring is unpublished', async () => {
    jest.mocked(getStoreProjection).mockResolvedValue(projection());
    client.products.search.mockResolvedValue({ products: [listing] });
    await handleProductTailoringMessage(context, tailoring('ProductTailoringUnpublished'));
    expect(client.products.update).toHaveBeenCalledTimes(1);
  });

  it('deactivates the listings when the product left the store', async () => {
    jest.mocked(getStoreProjection).mockResolvedValue(undefined);
    jest.mocked(getProduct).mockResolvedValue({
      masterData: { current: { masterVariant: { sku: 'sku-1' }, variants: [] } },
    } as never);
    client.products.search.mockResolvedValue({ products: [listing] });
    await handleProductTailoringMessage(context, tailoring('ProductTailoringDeleted'));
    expect(client.products.deactivate).toHaveBeenCalledWith(['t-1']);
  });
});

describe('inventory messages', () => {
  const entry = { id: 'i-1', sku: 'sku-1', availableQuantity: 4, supplyChannel: { typeId: 'channel', id: 'channel-1' } };
  const quantitySet = { type: 'InventoryEntryQuantitySet' } as never;

  beforeEach(() => {
    jest.mocked(getInventoryEntry).mockResolvedValue(entry as never);
    jest.mocked(findStoreProjectionBySku).mockResolvedValue(projection());
  });

  it('pushes the absolute quantity to the listing that carries the SKU', async () => {
    client.products.search.mockResolvedValue({ products: [listing] });
    await handleInventoryMessage(context, quantitySet, 'i-1');
    await handleInventoryMessage(context, quantitySet, 'i-1');
    expect(mappers.Inventory.mapCommercetoolsInventoryToTiktokInventory).toHaveBeenCalledWith(
      context.shop,
      listing,
      entry,
    );
    expect(client.inventory.update).toHaveBeenCalledWith('t-1', { skus: [] });
    expect(client.products.update).not.toHaveBeenCalled();
  });

  it('syncs the product when the SKU is not on TikTok yet', async () => {
    client.products.search.mockResolvedValue({ products: [{ id: 't-9', skus: [{ sellerSku: 'other' }] }] });
    await handleInventoryMessage(context, quantitySet, 'i-1');
    expect(client.inventory.update).not.toHaveBeenCalled();
    expect(client.products.update).toHaveBeenCalledWith('t-9', { title: 'edit' });
  });

  it('creates the listing when TikTok has none', async () => {
    await handleInventoryMessage(context, { type: 'InventoryEntryCreated' } as never, 'i-1');
    expect(client.products.create).toHaveBeenCalledTimes(1);
  });

  it('ignores entries of other supply channels', async () => {
    jest.mocked(getInventoryEntry).mockResolvedValue({ ...entry, supplyChannel: { typeId: 'channel', id: 'other' } } as never);
    await handleInventoryMessage(context, quantitySet, 'i-1');
    expect(client.products.search).not.toHaveBeenCalled();
  });

  it('ignores entries whose product is not in the store', async () => {
    jest.mocked(findStoreProjectionBySku).mockResolvedValue(undefined);
    await handleInventoryMessage(context, quantitySet, 'i-1');
    expect(client.products.search).not.toHaveBeenCalled();
  });

  it('zeroes the stock when the entry is deleted', async () => {
    client.products.search.mockResolvedValue({ products: [listing] });
    await handleInventoryMessage(
      context,
      { type: 'InventoryEntryDeleted', sku: 'sku-1', supplyChannel: { typeId: 'channel', id: 'channel-1' } } as never,
      'i-1',
    );
    expect(mappers.Inventory.mapCommercetoolsInventoryToTiktokInventory).toHaveBeenCalledWith(
      context.shop,
      listing,
      { sku: 'sku-1', availableQuantity: 0 },
    );
    expect(client.inventory.update).toHaveBeenCalledTimes(1);
  });
});
