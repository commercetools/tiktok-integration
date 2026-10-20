/// <reference path="../../../@types/commercetools__sync-actions/index.d.ts" />
/// <reference path="../../../@types-extensions/graphql-ctp/index.d.ts" />

import { useMcLazyQuery } from '@commercetools-frontend/application-shell';
import { GRAPHQL_TARGETS } from '@commercetools-frontend/constants';
import FetchProductsByIdsQuery from './fetch-products-by-ids.ctp.graphql';
import { useApplicationContext } from '@commercetools-frontend/application-shell-connectors';

type TImage = {
  url: string;
};

type TMasterVariant = {
  sku?: string;
  images?: TImage[];
};

type TCurrentProductData = {
  name?: string;
  masterVariant: TMasterVariant;
};

type TMasterData = {
  current: TCurrentProductData;
};

type TProduct = {
  id: string;
  masterData: TMasterData;
};

type TFetchProductsByIdsQuery = {
  products: {
    results: TProduct[];
  };
};

type TFetchProductsByIdsQueryVariables = {
  where: string;
  locale: string;
};

export type TEnrichedProduct = {
  id: string;
  name: string;
  sku: string;
  imageUrl?: string;
};

type TUseProductsByIds = () => {
  getProductsByIds: (ids: string[]) => Promise<TEnrichedProduct[]>;
  loading: boolean;
};

export const useProductsByIds: TUseProductsByIds = () => {
  const { dataLocale } = useApplicationContext((context) => ({
    dataLocale: context.dataLocale,
  }));
  const [fetchProducts, { loading }] = useMcLazyQuery<
    TFetchProductsByIdsQuery,
    TFetchProductsByIdsQueryVariables
  >(FetchProductsByIdsQuery);

  const getProductsByIds = async (ids: string[]): Promise<TEnrichedProduct[]> => {
    if (ids.length === 0) {
      return [];
    }

    const result = await fetchProducts({
      variables: { where:`id in (${ids.map((id) => `"${id}"`).join(',')})`, locale: dataLocale },
      context: {
        target: GRAPHQL_TARGETS.COMMERCETOOLS_PLATFORM,
      },
      fetchPolicy: 'network-only',
    });

    if (!result.data?.products?.results) {
      return [];
    }

    return result.data.products.results.map((product: TProduct) => ({
      id: product.id,
      name: product.masterData.current.name || 'Unnamed Product',
      sku: product.masterData.current.masterVariant.sku || 'No SKU',
      imageUrl: product.masterData.current.masterVariant.images?.[0]?.url,
    }));
  };

  return {
    getProductsByIds,
    loading,
  };
};

