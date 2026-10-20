/// <reference path="../../../@types/commercetools__sync-actions/index.d.ts" />
/// <reference path="../../../@types-extensions/graphql-ctp/index.d.ts" />

import { useState } from 'react';
import type { ApolloError } from '@apollo/client';
import { useMcQuery } from '@commercetools-frontend/application-shell';
import { GRAPHQL_TARGETS } from '@commercetools-frontend/constants';
import {
  SHARED_SHOP_CONTAINER_KEY,
  SHARED_SHOP_SERVICE_URL_VARIABLE_KEY,
} from '../../constants';
import FetchServiceUrlQuery from './fetch-service-url.ctp.graphql';

type TFetchServiceUrlQuery = {
  customObject?: {
    id: string;
    version: number;
    container: string;
    key: string;
    value: string;
  };
};

type TFetchServiceUrlQueryVariables = {
  container: string;
  key: string;
};

type TUseServiceUrlFetcher = () => {
  serviceUrl?: string;
  error?: ApolloError;
  loading: boolean;
};

export const useServiceUrlFetcher: TUseServiceUrlFetcher = () => {
  const { data, error, loading } = useMcQuery<
    TFetchServiceUrlQuery,
    TFetchServiceUrlQueryVariables
  >(FetchServiceUrlQuery, {
    variables: {
      container: SHARED_SHOP_CONTAINER_KEY,
      key: SHARED_SHOP_SERVICE_URL_VARIABLE_KEY,
    },
    context: {
      target: GRAPHQL_TARGETS.COMMERCETOOLS_PLATFORM,
    },
  });

  // Parse the value from the custom object
  let serviceUrl: string | undefined;

  if (data?.customObject?.value) {
    try {
      // The value in custom objects is stored as a JSON string
      const parsedValue = JSON.parse(data.customObject.value);
      serviceUrl = parsedValue.serviceUrl || parsedValue.url;
    } catch (e) {
      // If parsing fails, use the value directly
      serviceUrl = data.customObject.value;
    }
  }

  return {
    serviceUrl,
    error,
    loading,
  };
};

type TUseConnectProject = () => {
  connectProject: (
    token: string,
    ct_client_id: string,
    ct_client_secret: string,
    ct_region: string
  ) => Promise<string>;
  getAuthorizationLink: () => Promise<string>;
  fullProductCheck: () => Promise<{
    importableProducts: string[];
    unimportableProducts: { id: string; error: string }[];
  }>;
  selectiveProductSync: (productIds: string[]) => Promise<string>;
  loading: boolean;
};

export const useConnectProject: TUseConnectProject = () => {
  const [loading, setLoading] = useState(false);
  const { serviceUrl } = useServiceUrlFetcher();

  const getAuthorizationLink = async () => {
    if (!serviceUrl) {
      throw new Error('Service URL is not available');
    }
    const response = await fetch(`${serviceUrl}/authorization-link`, {
      method: 'GET',
    });
    if (!response.ok) {
      throw new Error(`Failed to get authorization link: ${response.statusText}`);
    }
    return await response.text();
  };

  const connectProject = async (
    token: string,
    ct_client_id: string,
    ct_client_secret: string,
    ct_region: string
  ) => {
    if (!serviceUrl) {
      throw new Error('Service URL is not available');
    }
    setLoading(true);
    try {
      const response = await fetch(
        `${serviceUrl}/connect-project?shop_doc_id=${token}&ct_client_id=${ct_client_id}&ct_client_secret=${ct_client_secret}&ct_region=${ct_region}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'text/plain',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to connect project: ${response.statusText}`);
      }

      return await response.text();
    } finally {
      setLoading(false);
    }
  };

  const fullProductCheck = async () => {
    if (!serviceUrl) {
      throw new Error('Service URL is not available');
    }
    setLoading(true);
    try {
      const response = await fetch(`${serviceUrl}/full-product-check`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Failed to check products: ${response.statusText}`);
      }

      return await response.json();
    } finally {
      setLoading(false);
    }
  };

  const selectiveProductSync = async (productIds: string[]) => {
    if (!serviceUrl) {
      throw new Error('Service URL is not available');
    }
    setLoading(true);
    try {
      const response = await fetch(`${serviceUrl}/selective-product-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productIds }),
      });

      if (!response.ok) {
        throw new Error(`Failed to sync products: ${response.statusText}`);
      }

      return await response.text();
    } finally {
      setLoading(false);
    }
  };

  return {
    connectProject,
    getAuthorizationLink,
    fullProductCheck,
    selectiveProductSync,
    loading,
  };
};
