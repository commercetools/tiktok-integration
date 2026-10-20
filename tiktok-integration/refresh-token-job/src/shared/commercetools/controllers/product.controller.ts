import {
  ByProjectKeyRequestBuilder,
  Product,
  ProductProjection,
  ProductProjectionPagedQueryResponse,
} from '@commercetools/platform-sdk';
import { ProductQuery, ShopConfigurationData } from '../../interfaces';
import { fetchAllEntitiesRecusively } from '../../utils/fetch-all';
import { logger } from '../../utils/logger';

const getProducts = async (
  apiRoot: ByProjectKeyRequestBuilder,
  shopConfiguration: ShopConfigurationData,
  limit = 100,
  offset = 0,
): Promise<ProductProjectionPagedQueryResponse> => {
  return apiRoot
    .productProjections()
    .get({
      queryArgs: {
        ...(shopConfiguration.ctStoreKey && {
          storeProjection: shopConfiguration.ctStoreKey,
        }),
        limit: limit,
        offset: offset,
      },
    })
    .execute()
    .then((response) => response.body);
};

export const getAllProducts = async (
  apiRoot: ByProjectKeyRequestBuilder,
  shopConfiguration?: ShopConfigurationData | null,
): Promise<ProductProjectionPagedQueryResponse> => {
  if (!shopConfiguration) {
    throw new Error('Shop configuration is required to fetch all products');
  }

  return fetchAllEntitiesRecusively<ProductProjection>(
    apiRoot,
    shopConfiguration,
    getProducts,
  );
};

export const getUnpublishedProduct = async (
  apiRoot: ByProjectKeyRequestBuilder,
  productId: string,
): Promise<Product | null> => {
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
  shopConfiguration?: ShopConfigurationData | null,
): Promise<ProductProjection | null> => {
  if (!shopConfiguration) {
    return apiRoot
      .productProjections()
      .withId({ ID: productId })
      .get()
      .execute()
      .then((response) => response.body)
      .catch(() => {
        return null;
      });
  }
  if (shopConfiguration?.ctStoreKey) {
    return apiRoot
      .inStoreKeyWithStoreKeyValue({ storeKey: shopConfiguration.ctStoreKey })
      .productProjections()
      .withId({ ID: productId })
      .get()
      .execute()
      .then((response) => response.body)
      .catch(() => {
        return null;
      });
  }
  return apiRoot
    .productProjections()
    .withId({ ID: productId })
    .get()
    .execute()
    .then((response) => response.body)
    .catch(() => {
      return null;
    });
};

export const queryProduct = async (
  apiRoot: ByProjectKeyRequestBuilder,
  query: ProductQuery,
): Promise<ProductProjection[] | null> => {
  const where = [];
  if (query.skus) {
    where.push(
      `masterVariant(sku in (${query.skus.map((sku) => `"${sku}"`).join(',')})) OR variants(sku in (${query.skus.map((sku) => `"${sku}"`).join(',')}))`,
    );
  }
  if (query.productIds) {
    where.push(`id in (${query.productIds.map((id) => `"${id}"`).join(',')})`);
  }
  if (where.length === 0) {
    return [];
  }

  logger.info(`Querying product with where: ${where.join(' AND ')}`);
  return apiRoot
    .productProjections()
    .get({
      queryArgs: {
        where: where.join(' AND '),
        ...(query.limit && { limit: query.limit }),
        ...(query.offset && { offset: query.offset }),
      },
    })
    .execute()
    .then((response) => response.body?.results)
    .catch((e) => {
      logger.error(`Error querying product`, e);
      return [];
    });
};
