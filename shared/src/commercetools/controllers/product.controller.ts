import {
  ByProjectKeyRequestBuilder,
  Product,
  ProductProjection,
  ProductProjectionPagedQueryResponse,
} from '@commercetools/platform-sdk';
import { fetchAllEntities } from '../../utils/fetch-all';
import { logger } from '../../logger';

const getProducts = async (
  apiRoot: ByProjectKeyRequestBuilder,
  storeKey: string | undefined,
  limit: number,
  offset: number,
): Promise<ProductProjectionPagedQueryResponse> =>
  apiRoot
    .productProjections()
    .get({
      queryArgs: {
        ...(storeKey && { storeProjection: storeKey }),
        limit,
        offset,
      },
    })
    .execute()
    .then((response) => response.body);

/** All product projections, scoped to the TikTok store's assortment when a store key is given. */
export const getAllProducts = async (
  apiRoot: ByProjectKeyRequestBuilder,
  storeKey?: string,
): Promise<ProductProjectionPagedQueryResponse> =>
  fetchAllEntities<ProductProjection>((limit, offset) =>
    getProducts(apiRoot, storeKey, limit, offset),
  ) as Promise<ProductProjectionPagedQueryResponse>;

export const getUnpublishedProduct = async (
  apiRoot: ByProjectKeyRequestBuilder,
  productId: string,
): Promise<Product | null> => {
  logger.info('getUnpublishedProduct', productId);
  return apiRoot
    .products()
    .withId({ ID: productId })
    .get()
    .execute()
    .then((response) => response.body)
    .catch(() => {
      return null;
    });
};

export const getProduct = async (
  apiRoot: ByProjectKeyRequestBuilder,
  productId: string,
  storeKey?: string,
): Promise<ProductProjection | null> => {
  const builder = storeKey
    ? apiRoot.inStoreKeyWithStoreKeyValue({ storeKey }).productProjections()
    : apiRoot.productProjections();
  return builder
    .withId({ ID: productId })
    .get()
    .execute()
    .then((response) => response.body)
    .catch(() => null);
};
