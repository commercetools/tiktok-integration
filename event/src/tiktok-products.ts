import type {
  ByProjectKeyRequestBuilder,
  ProductProjection,
} from '@commercetools/platform-sdk';
import { getTikTokStore } from 'tiktok-shared/dist/state';
import { getShopContext } from 'tiktok-shared/dist/services';
import type { ShopContext } from 'tiktok-shared/dist/interfaces';
import * as Mappers from 'tiktok-shared/dist/mappers';
import { createApiRoot } from 'tiktok-shared/dist/commercetools/client';
import { logger } from 'tiktok-shared/dist/logger';
import { getTikTokClient, type TikTokClient } from 'tiktok-shared/dist/tiktok/client';
import type { Product202502SearchProductsResponseDataProducts } from 'tiktok-shared/dist/tiktok-sdk';

/** TikTok accepts at most 9 main images per product and 100 search results per page. */
const MAX_MAIN_IMAGES = 9;
const MAX_SEARCH_PAGE_SIZE = 100;

export type TiktokListing = Product202502SearchProductsResponseDataProducts;

export interface SyncContext {
  apiRoot: ByProjectKeyRequestBuilder;
  /** Key of the commercetools Store that represents the TikTok shop. */
  storeKey: string;
  shop: ShopContext;
  client: TikTokClient;
}

export const createSyncContext = async (): Promise<SyncContext> => {
  const apiRoot = createApiRoot();
  const [store, shop, client] = await Promise.all([
    getTikTokStore(apiRoot),
    getShopContext(apiRoot),
    getTikTokClient(),
  ]);
  return { apiRoot, storeKey: store.key, shop, client };
};

export const variantSkus = (
  product: Pick<ProductProjection, 'masterVariant' | 'variants'>,
): string[] =>
  [product.masterVariant, ...product.variants]
    .map((variant) => variant.sku)
    .filter((sku): sku is string => typeof sku === 'string' && sku !== '');

/** TikTok products that carry at least one of the given seller SKUs. */
export const findTiktokProductsBySkus = async (
  { client }: SyncContext,
  skus: string[],
): Promise<TiktokListing[]> => {
  if (skus.length === 0) {
    return [];
  }
  const result = await client.products.search(
    { sellerSkus: skus },
    { pageSize: Math.min(skus.length, MAX_SEARCH_PAGE_SIZE) },
  );
  return result.products ?? [];
};

const productImageUrls = (product: ProductProjection): string[] => {
  const urls = [product.masterVariant, ...product.variants].flatMap(
    (variant) => variant.images?.map((image) => image.url) ?? [],
  );
  return [...new Set(urls)].slice(0, MAX_MAIN_IMAGES);
};

export const createTiktokProduct = async (
  { apiRoot, client }: SyncContext,
  product: ProductProjection,
): Promise<void> => {
  const imageUrls = productImageUrls(product);
  if (imageUrls.length === 0) {
    throw new Error(
      `Product ${product.id} has no images; TikTok requires at least one main image`,
    );
  }
  const draft = await Mappers.Product.commercetoolsProductToTiktokProduct(
    apiRoot,
    product,
  );
  const mainImages: { uri: string }[] = [];
  for (const imageUrl of imageUrls) {
    const { uri } = await client.images.upload(imageUrl);
    if (uri) {
      mainImages.push({ uri });
    }
  }
  await client.products.create({ ...draft, mainImages });
  logger.info(`Created TikTok product for commercetools product ${product.id}`);
};

export const updateTiktokProducts = async (
  { apiRoot, client, shop }: SyncContext,
  tiktokProductIds: string[],
  product: ProductProjection,
): Promise<void> => {
  for (const tiktokProductId of tiktokProductIds) {
    const current = await client.products.get(tiktokProductId, {
      locale: shop.locale,
    });
    const edit =
      await Mappers.Product.mergeTiktokProductAndCommercetoolsProductToTiktokProductEdit(
        apiRoot,
        current,
        product,
      );
    await client.products.update(tiktokProductId, edit);
  }
  logger.info(
    `Updated ${tiktokProductIds.length} TikTok products for commercetools product ${product.id}`,
  );
};

const idsOf = (listings: TiktokListing[]): string[] =>
  listings
    .map((listing) => listing.id)
    .filter((id): id is string => typeof id === 'string');

/**
 * Brings TikTok in line with a published commercetools product: creates the listing when no
 * TikTok product carries its SKUs, updates the listings otherwise. Safe to run repeatedly.
 */
export const syncProduct = async (
  context: SyncContext,
  product: ProductProjection,
  existing?: TiktokListing[],
): Promise<void> => {
  const skus = variantSkus(product);
  if (skus.length === 0) {
    logger.warn(`Product ${product.id} has no variant SKUs; nothing to sync`);
    return;
  }
  const listings = existing ?? (await findTiktokProductsBySkus(context, skus));
  if (listings.length === 0) {
    await createTiktokProduct(context, product);
    return;
  }
  await updateTiktokProducts(context, idsOf(listings), product);
};

export const removeTiktokProducts = async (
  context: SyncContext,
  skus: string[],
  mode: 'deactivate' | 'delete',
): Promise<void> => {
  const ids = idsOf(await findTiktokProductsBySkus(context, skus));
  if (ids.length === 0) {
    logger.info('No TikTok products carry the SKUs; nothing to remove');
    return;
  }
  if (mode === 'delete') {
    await context.client.products.delete(ids);
  } else {
    await context.client.products.deactivate(ids);
  }
  logger.info(`${mode === 'delete' ? 'Deleted' : 'Deactivated'} ${ids.length} TikTok products`);
};
