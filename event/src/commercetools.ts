import type {
  ByProjectKeyRequestBuilder,
  InventoryEntry,
  Product,
  ProductProjection,
} from '@commercetools/platform-sdk';

const isNotFound = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { statusCode?: number }).statusCode === 404;

const orUndefinedOnNotFound = async <T>(
  request: Promise<{ body: T }>,
): Promise<T | undefined> => {
  try {
    return (await request).body;
  } catch (error) {
    if (isNotFound(error)) {
      return undefined;
    }
    throw error;
  }
};

const quote = (value: string): string =>
  `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

/** The current projection of a product as the TikTok store sees it (tailoring applied); undefined when the product is not in that store. */
export const getStoreProjection = (
  apiRoot: ByProjectKeyRequestBuilder,
  storeKey: string,
  productId: string,
): Promise<ProductProjection | undefined> =>
  orUndefinedOnNotFound(
    apiRoot
      .inStoreKeyWithStoreKeyValue({ storeKey })
      .productProjections()
      .withId({ ID: productId })
      .get({ queryArgs: { staged: false } })
      .execute(),
  );

export const getProduct = (
  apiRoot: ByProjectKeyRequestBuilder,
  productId: string,
): Promise<Product | undefined> =>
  orUndefinedOnNotFound(
    apiRoot.products().withId({ ID: productId }).get().execute(),
  );

export const getInventoryEntry = (
  apiRoot: ByProjectKeyRequestBuilder,
  inventoryEntryId: string,
): Promise<InventoryEntry | undefined> =>
  orUndefinedOnNotFound(
    apiRoot.inventory().withId({ ID: inventoryEntryId }).get().execute(),
  );

/** The projection, in the TikTok store, of the product that owns `sku`. */
export const findStoreProjectionBySku = async (
  apiRoot: ByProjectKeyRequestBuilder,
  storeKey: string,
  sku: string,
): Promise<ProductProjection | undefined> => {
  const { body } = await apiRoot
    .productProjections()
    .get({
      queryArgs: {
        where: `masterVariant(sku=${quote(sku)}) or variants(sku=${quote(sku)})`,
        storeProjection: storeKey,
        staged: false,
        limit: 1,
      },
    })
    .execute();
  return body.results[0];
};
