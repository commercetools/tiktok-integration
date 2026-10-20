/// <reference path="../../../@types/commercetools__sync-actions/index.d.ts" />
/// <reference path="../../../@types-extensions/graphql-ctp/index.d.ts" />

import type { ApolloError } from '@apollo/client';
import { useMcQuery } from '@commercetools-frontend/application-shell';
import { GRAPHQL_TARGETS } from '@commercetools-frontend/constants';
import FetchProductTypesQuery from './fetch-product-types.ctp.graphql';

type TProductType = {
  id: string;
  version: number;
  key: string;
  name: string;
  description?: string;
};

type TFetchProductTypesQuery = {
  productTypes: {
    total: number;
    count: number;
    offset: number;
    results: TProductType[];
  };
};

type TFetchProductTypesQueryVariables = {
  limit?: number;
  offset?: number;
  sort?: string[];
};

type TUseProductTypesFetcher = (
  variables?: TFetchProductTypesQueryVariables
) => {
  productTypes?: TProductType[];
  productTypesResult?: TFetchProductTypesQuery['productTypes'];
  error?: ApolloError;
  loading: boolean;
  refetch: () => void;
};

export const useProductTypesFetcher: TUseProductTypesFetcher = (
  variables = {}
) => {
  const { data, error, loading, refetch } = useMcQuery<
    TFetchProductTypesQuery,
    TFetchProductTypesQueryVariables
  >(FetchProductTypesQuery, {
    variables: {
      limit: variables.limit || 500,
      offset: variables.offset || 0,
      sort: variables.sort || ['createdAt asc'],
    },
    context: {
      target: GRAPHQL_TARGETS.COMMERCETOOLS_PLATFORM,
    },
  });

  return {
    productTypes: data?.productTypes?.results,
    productTypesResult: data?.productTypes,
    error,
    loading,
    refetch,
  };
};
