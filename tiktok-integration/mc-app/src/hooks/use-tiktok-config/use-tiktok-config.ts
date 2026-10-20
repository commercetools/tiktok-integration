/// <reference path="../../../@types/commercetools__sync-actions/index.d.ts" />
/// <reference path="../../../@types-extensions/graphql-ctp/index.d.ts" />

import type { ApolloError } from '@apollo/client';
import { useMcQuery } from '@commercetools-frontend/application-shell';
import { GRAPHQL_TARGETS } from '@commercetools-frontend/constants';
import {
  SHARED_SHOP_CONTAINER_KEY,
  SHARED_SHOP_CONFIGURATION_VARIABLE_KEY,
} from '../../constants';
import FetchTikTokConfigQuery from './fetch-tiktok-config.ctp.graphql';

export type TTikTokConfiguration = {
  isAuthorized?: boolean;
  locale?: string;
  shop_region?: string;
  shopCipher?: string;
  ctSupplyChannelId?: string;
  ctDistributionChannelId?: string;
  ctStoreId?: string;
  ctStoreKey?: string;
  tiktokWarehouseId?: string;
  tiktokWarehouseEntityId?: string;
  isInitialized?: boolean;
};

type TFetchTikTokConfigQuery = {
  customObject?: {
    id: string;
    version: number;
    container: string;
    key: string;
    value: string;
  };
};

type TFetchTikTokConfigQueryVariables = {
  container: string;
  key: string;
};

type TUseTikTokConfigFetcher = () => {
  configuration?: TTikTokConfiguration;
  error?: ApolloError;
  loading: boolean;
};

export const useTikTokConfigFetcher: TUseTikTokConfigFetcher = () => {
  const { data, error, loading } = useMcQuery<
    TFetchTikTokConfigQuery,
    TFetchTikTokConfigQueryVariables
  >(FetchTikTokConfigQuery, {
    variables: {
      container: SHARED_SHOP_CONTAINER_KEY,
      key: SHARED_SHOP_CONFIGURATION_VARIABLE_KEY,
    },
    context: {
      target: GRAPHQL_TARGETS.COMMERCETOOLS_PLATFORM,
    },
  });

  // Parse the value from the custom object
  const configuration: TTikTokConfiguration | undefined =
    data?.customObject?.value;

  return {
    configuration,
    error,
    loading,
  };
};
