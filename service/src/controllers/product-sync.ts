import type { ByProjectKeyRequestBuilder, ProductProjection } from '@commercetools/platform-sdk';
import { createApiRoot } from '../../../shared/commercetools/client';
import { getAllProducts } from '../../../shared/commercetools/controllers/product.controller';
import { logger } from '../../../shared/logger';
import {
  buildTiktokProductDraft,
  loadProductMappingContext,
  type ProductMappingContext,
} from '../../../shared/mappers/product/product.mapper';
import { getTikTokStore, getValidAccessToken } from '../../../shared/state';
import { getTikTokClient, type TikTokClient } from '../../../shared/tiktok/client';
import { HttpError } from '../errors/http-error';

/** TikTok accepts at most nine main images per product. */
const MAX_MAIN_IMAGES = 9;
/** commercetools returns at most this many results per page. */
const MAX_SELECTIVE_PRODUCTS = 500;

export interface ActionResult {
  message: string;
}

export interface ProductCheckResult {
  importableProducts: string[];
  unimportableProducts: { id: string; error: string }[];
}

type SyncOutcome = 'created' | 'skipped';

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const isApiError = (error: unknown): boolean =>
  typeof (error as { statusCode?: unknown } | null)?.statusCode === 'number';

/** Configuration problems (no warehouse channel, no locale, ...) are the caller's to fix: 400. */
const loadContext = async (apiRoot: ByProjectKeyRequestBuilder): Promise<ProductMappingContext> => {
  try {
    return await loadProductMappingContext(apiRoot);
  } catch (error) {
    if (error instanceof Error && !isApiError(error)) {
      throw new HttpError(400, error.message);
    }
    throw error;
  }
};

const loadProducts = async (
  apiRoot: ByProjectKeyRequestBuilder,
  productIds?: string[],
): Promise<ProductProjection[]> => {
  const { key: storeKey } = await getTikTokStore(apiRoot);
  if (!productIds) {
    return (await getAllProducts(apiRoot, storeKey)).results;
  }
  // Ids come from the caller: pass them as a predicate variable, never interpolated.
  const { body } = await apiRoot
    .productProjections()
    .get({
      queryArgs: {
        storeProjection: storeKey,
        where: 'id in :ids',
        'var.ids': productIds,
        limit: MAX_SELECTIVE_PRODUCTS,
      },
    })
    .execute();
  return body.results;
};

const uniqueImageUrls = (product: ProductProjection): string[] => [
  ...new Set(
    [product.masterVariant, ...product.variants].flatMap(
      (variant) => variant.images?.map((image) => image.url) ?? [],
    ),
  ),
];

/**
 * Creates the product on TikTok unless TikTok already lists a product with one of its seller
 * SKUs, so running a sync twice does not create duplicates.
 */
const syncProduct = async (
  client: TikTokClient,
  product: ProductProjection,
  context: ProductMappingContext,
): Promise<SyncOutcome> => {
  const draft = buildTiktokProductDraft(product, context, { includeExternalProductId: true });
  const sellerSkus = (draft.skus ?? []).flatMap(({ sellerSku }) => (sellerSku ? [sellerSku] : []));
  if (sellerSkus.length > 0) {
    const found = await client.products.search({ sellerSkus }, { pageSize: 1 });
    if ((found.products?.length ?? 0) > 0) {
      return 'skipped';
    }
  }
  const mainImages: { uri: string }[] = [];
  for (const url of uniqueImageUrls(product).slice(0, MAX_MAIN_IMAGES)) {
    const { uri } = await client.images.upload(url);
    if (uri) {
      mainImages.push({ uri });
    }
  }
  await client.products.create({ ...draft, mainImages });
  return 'created';
};

const syncProducts = async (
  label: string,
  client: TikTokClient,
  products: ProductProjection[],
  context: ProductMappingContext,
): Promise<void> => {
  const summary = { created: 0, skipped: 0, failed: 0 };
  for (const product of products) {
    try {
      summary[await syncProduct(client, product, context)] += 1;
    } catch (error) {
      summary.failed += 1;
      logger.error(`${label}: syncing product failed`, {
        productId: product.id,
        error: errorMessage(error),
      });
    }
  }
  logger.info(`${label}: finished`, summary);
};

const startSync = async (label: string, productIds?: string[]): Promise<ActionResult> => {
  const apiRoot = createApiRoot();
  await getValidAccessToken();
  const context = await loadContext(apiRoot);
  const products = await loadProducts(apiRoot, productIds);
  if (products.length === 0) {
    throw new HttpError(400, 'No products found to synchronize');
  }
  const client = await getTikTokClient();
  syncProducts(label, client, products, context).catch((error: unknown) => {
    logger.error(`${label}: aborted`, { error: errorMessage(error) });
  });
  return { message: `${label} started for ${products.length} products` };
};

/** Starts a sync of every product of the TikTok store; it continues after the response. */
export const startFullProductSync = (): Promise<ActionResult> => startSync('Full sync');

export const startSelectiveProductSync = async (productIds: unknown): Promise<ActionResult> => {
  if (
    !Array.isArray(productIds) ||
    productIds.length === 0 ||
    productIds.length > MAX_SELECTIVE_PRODUCTS ||
    !productIds.every((id) => typeof id === 'string' && id !== '')
  ) {
    throw new HttpError(
      400,
      `"productIds" must be a list of 1 to ${MAX_SELECTIVE_PRODUCTS} product ids`,
    );
  }
  return startSync('Selective sync', productIds as string[]);
};

/** Reports which products the mapping can turn into a TikTok listing; nothing is sent to TikTok. */
export const runFullProductCheck = async (): Promise<ProductCheckResult> => {
  const apiRoot = createApiRoot();
  const context = await loadContext(apiRoot);
  const result: ProductCheckResult = { importableProducts: [], unimportableProducts: [] };
  for (const product of await loadProducts(apiRoot)) {
    try {
      buildTiktokProductDraft(product, context);
      result.importableProducts.push(product.id);
    } catch (error) {
      result.unimportableProducts.push({ id: product.id, error: errorMessage(error) });
    }
  }
  return result;
};
