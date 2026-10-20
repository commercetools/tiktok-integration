/// <reference path="../../../@types/commercetools__sync-actions/index.d.ts" />
/// <reference path="../../../@types-extensions/graphql-ctp/index.d.ts" />

import type { ApolloError } from '@apollo/client';
import {
  useMcQuery,
  useMcMutation,
  useMcLazyQuery,
} from '@commercetools-frontend/application-shell';
import { GRAPHQL_TARGETS } from '@commercetools-frontend/constants';
import FetchStoresQuery from './fetch-stores.ctp.graphql';
import FetchStoreByIdQuery from './fetch-store-by-id.ctp.graphql';
import UpdateStoreCustomMutation from './update-store-custom.ctp.graphql';

type TCustomFieldRaw = {
  name: string;
  value: string;
};

type TCustomType = {
  id: string;
  key: string;
};

type TChannel = {
  id: string;
  key: string;
};

type TLocalizedString = {
  locale: string;
  value: string;
};

type TStore = {
  id: string;
  version: number;
  key: string;
  name?: string;
  nameAllLocales?: TLocalizedString[];
  languages?: string[];
  countries?: string[];
  distributionChannels?: TChannel[];
  supplyChannels?: TChannel[];
  custom?: {
    type: TCustomType;
    customFieldsRaw: TCustomFieldRaw[];
  };
};

type TFetchStoresQuery = {
  stores: {
    total: number;
    count: number;
    offset: number;
    results: TStore[];
  };
};

type TFetchStoresQueryVariables = {
  limit?: number;
  offset?: number;
  sort?: string[];
};

type TFetchStoreByIdQuery = {
  store?: TStore;
};

type TFetchStoreByIdQueryVariables = {
  storeId: string;
};

type TUpdateStoreCustomMutation = {
  updateStore: TStore;
};

type TUpdateStoreCustomMutationVariables = {
  storeId: string;
  version: number;
  actions: Array<{
    setCustomType?: {
      type?: {
        typeId: string;
        key: string;
      };
      fields?: Record<string, any>;
    };
  }>;
};

type TUseStoresFetcher = (variables?: TFetchStoresQueryVariables) => {
  stores?: TStore[];
  storesResult?: TFetchStoresQuery['stores'];
  error?: ApolloError;
  loading: boolean;
  refetch: () => void;
};

export const useStoresFetcher: TUseStoresFetcher = (variables = {}) => {
  const { data, error, loading, refetch } = useMcQuery<
    TFetchStoresQuery,
    TFetchStoresQueryVariables
  >(FetchStoresQuery, {
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
    stores: data?.stores?.results,
    error,
    loading,
    refetch,
  };
};

type TUseStoreByIdFetcher = () => {
  getStoreById: (storeId: string) => Promise<TStore | undefined>;
  loading: boolean;
};

export const useStoreByIdFetcher: TUseStoreByIdFetcher = () => {
  const [fetchStore, { loading }] = useMcLazyQuery<
    TFetchStoreByIdQuery,
    TFetchStoreByIdQueryVariables
  >(FetchStoreByIdQuery);

  const getStoreById = async (storeId: string): Promise<TStore | undefined> => {
    const result = await fetchStore({
      variables: { storeId },
      context: {
        target: GRAPHQL_TARGETS.COMMERCETOOLS_PLATFORM,
      },
      fetchPolicy: 'network-only',
    });

    return result.data?.store;
  };

  return {
    getStoreById,
    loading,
  };
};

type TUseStoreCustomUpdater = () => {
  updateStoreCustom: (params: {
    storeId: string;
    typeKey?: string;
    fields?: Record<string, any>;
  }) => Promise<TStore>;
  loading: boolean;
};

export const useStoreCustomUpdater: TUseStoreCustomUpdater = () => {
  const { getStoreById } = useStoreByIdFetcher();
  const [updateStoreMutation, { loading }] = useMcMutation<
    TUpdateStoreCustomMutation,
    TUpdateStoreCustomMutationVariables
  >(UpdateStoreCustomMutation);

  const updateStoreCustom = async ({
    storeId,
    typeKey,
    fields = {},
  }: {
    storeId: string;
    typeKey?: string;
    fields?: Record<string, any>;
  }) => {
    // Fetch the latest version first
    const store = await getStoreById(storeId);

    if (!store) {
      throw new Error(`Store with id ${storeId} not found`);
    }

    const actions: TUpdateStoreCustomMutationVariables['actions'] = [];

    // Set custom type action
    if (typeKey) {
      actions.push({
        setCustomType: {
          type: {
            typeId: 'type',
            key: typeKey,
          },
          fields: Object.entries(fields).map(([key, value]) => ({
            name: key,
            value: value.toString(),
          })),
        },
      });
    }

    try {
      const result = await updateStoreMutation({
        context: {
          target: GRAPHQL_TARGETS.COMMERCETOOLS_PLATFORM,
        },
        variables: {
          storeId,
          version: store.version,
          actions,
        },
      });

      if (!result.data?.updateStore) {
        throw new Error('Failed to update store custom fields');
      }

      return result.data.updateStore;
    } catch (error) {
      throw error;
    }
  };

  return {
    updateStoreCustom,
    loading,
  };
};
