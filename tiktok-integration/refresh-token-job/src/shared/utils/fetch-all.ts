import { ByProjectKeyRequestBuilder } from '@commercetools/platform-sdk';
import { ShopConfigurationData } from '../interfaces';
import { PagedResponse } from '../interfaces/commercetools';

export const fetchAllEntitiesRecusively = async <T>(
  apiRoot: ByProjectKeyRequestBuilder,
  shopConfiguration: ShopConfigurationData,
  promiseFn: (
    apiRoot: ByProjectKeyRequestBuilder,
    shopConfiguration: ShopConfigurationData,
    limit: number,
    offset: number,
  ) => Promise<PagedResponse<T>>,
  limit = 100,
  offset = 0,
  accumulatedProducts: T[] = [],
): Promise<PagedResponse<T>> => {
  const response = await promiseFn(apiRoot, shopConfiguration, limit, offset);
  accumulatedProducts.push(...response.results);

  const fetchedCount = offset + response.count;
  const hasMoreProducts =
    response.total !== undefined && fetchedCount < response.total;
  if (hasMoreProducts) {
    return fetchAllEntitiesRecusively(
      apiRoot,
      shopConfiguration,
      promiseFn,
      limit,
      fetchedCount,
      accumulatedProducts,
    );
  }

  // Return the final aggregated response
  return {
    ...response,
    results: accumulatedProducts,
    count: accumulatedProducts.length,
    offset: 0,
  };
};
