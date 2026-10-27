/// <reference path="../../../@types-extensions/graphql-ctp/index.d.ts" />

import { useState } from 'react';
import type { ApolloError } from '@apollo/client';
import {
  useMcMutation,
  useMcQuery,
} from '@commercetools-frontend/application-shell';
import { GRAPHQL_TARGETS } from '@commercetools-frontend/constants';
import {
  createTikTokStore,
  type CreatedResources,
  type StoreSetupDeps,
  type StoreSetupInput,
} from './create-tiktok-store';
import CreateChannelMutation from './create-channel.ctp.graphql';
import CreateProductSelectionMutation from './create-product-selection.ctp.graphql';
import CreateStoreMutation from './create-store.ctp.graphql';
import FetchProductSelectionsQuery from './fetch-product-selections.ctp.graphql';

export type TProductSelection = {
  id: string;
  key?: string;
  nameAllLocales: { locale: string; value: string }[];
};

type TFetchProductSelectionsQuery = {
  productSelections: { results: TProductSelection[] };
};

type TFetchProductSelectionsQueryVariables = {
  limit?: number;
  offset?: number;
  sort?: string[];
};

export const useProductSelectionsFetcher = (): {
  productSelections?: TProductSelection[];
  error?: ApolloError;
  loading: boolean;
} => {
  const { data, error, loading } = useMcQuery<
    TFetchProductSelectionsQuery,
    TFetchProductSelectionsQueryVariables
  >(FetchProductSelectionsQuery, {
    variables: { limit: 500, offset: 0, sort: ['createdAt asc'] },
    context: { target: GRAPHQL_TARGETS.COMMERCETOOLS_PLATFORM },
  });
  return {
    productSelections: data?.productSelections?.results,
    error,
    loading,
  };
};

const context = { target: GRAPHQL_TARGETS.COMMERCETOOLS_PLATFORM };

/** Creates a store with an optional product selection and channels, see `createTikTokStore`. */
export const useStoreCreator = () => {
  const [loading, setLoading] = useState(false);
  const [createProductSelection] = useMcMutation<{
    createProductSelection: { id: string };
  }>(CreateProductSelectionMutation);
  const [createChannel] = useMcMutation<{ createChannel: { id: string } }>(
    CreateChannelMutation
  );
  const [createStore] = useMcMutation<{ createStore: { id: string } }>(
    CreateStoreMutation
  );

  const deps: StoreSetupDeps = {
    createProductSelection: async (draft) => {
      const result = await createProductSelection({
        context,
        variables: { draft },
      });
      if (!result.data?.createProductSelection) {
        throw new Error('The product selection could not be created');
      }
      return result.data.createProductSelection;
    },
    createChannel: async (draft) => {
      const result = await createChannel({ context, variables: { draft } });
      if (!result.data?.createChannel) {
        throw new Error('The channel could not be created');
      }
      return result.data.createChannel;
    },
    createStore: async (draft) => {
      const result = await createStore({ context, variables: { draft } });
      if (!result.data?.createStore) {
        throw new Error('The store could not be created');
      }
      return result.data.createStore;
    },
  };

  const create = async (input: StoreSetupInput, created: CreatedResources) => {
    setLoading(true);
    try {
      return await createTikTokStore(input, deps, created);
    } finally {
      setLoading(false);
    }
  };

  return { createTikTokStore: create, loading };
};
