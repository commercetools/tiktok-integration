/// <reference path="../../../@types/commercetools__sync-actions/index.d.ts" />
/// <reference path="../../../@types-extensions/graphql-ctp/index.d.ts" />

import { useState } from 'react';
import type { ApolloError } from '@apollo/client';
import {
  useMcQuery,
  useMcMutation,
} from '@commercetools-frontend/application-shell';
import { GRAPHQL_TARGETS } from '@commercetools-frontend/constants';
import { SHARED_SHOP_CONTAINER_KEY } from '../../constants';
import FetchProductMappersQuery from './fetch-mappers.ctp.graphql';
import UpdateMapperMutation from './update-mapper.ctp.graphql';

// Constants for mapper keys
const SHARED_SHOP_PRODUCT_TYPE_TO_CATEGORY_KEY = 'product_type_to_category_map';
const SHARED_SHOP_PRODUCT_TYPE_TO_SKU_ATTRIBUTE_KEY =
  'product_type_to_sku_attribute_map';
const SHARED_SHOP_PRODUCT_TYPE_TO_PRODUCT_ATTRIBUTE_KEY =
  'product_type_to_product_attribute_map';

/**
 * Stored SKU attribute mapper with base64-encoded function strings
 */
export interface StoredTikTokSkuAttributeMapper {
  name: string;
  tiktokAttributeId: string;
  valueNameFetcher?: string; // Base64 encoded function string
  valueIdFetcher?: string; // Base64 encoded function string
}

/**
 * Stored product attribute mapper with base64-encoded function strings
 */
export interface StoredTikTokProductAttributeMapper {
  name: string;
  tiktokAttributeId: string;
  valueNamesFetcher?: string; // Base64 encoded function string
  valueIdsFetcher?: string; // Base64 encoded function string
}

/**
 * Product type to TikTok category mapping
 */
export type ProductTypeToCategoryMap = Record<string, string>;

/**
 * Product type to SKU attribute mapping (stored format)
 */
export type StoredProductTypeToSkuAttributeMap = Record<
  string,
  StoredTikTokSkuAttributeMapper[]
>;

/**
 * Product type to product attribute mapping (stored format)
 */
export type StoredProductTypeToProductAttributeMap = Record<
  string,
  StoredTikTokProductAttributeMapper[]
>;

type TCustomObject = {
  id: string;
  version: number;
  container: string;
  key: string;
  value: string;
};

type TFetchProductMappersQuery = {
  categoryMap?: TCustomObject;
  skuAttributeMap?: TCustomObject;
  productAttributeMap?: TCustomObject;
};

type TFetchProductMappersQueryVariables = {
  container: string;
  categoryKey: string;
  skuAttributeKey: string;
  productAttributeKey: string;
};

type TUpdateMapperMutation = {
  createOrUpdateCustomObject: TCustomObject;
};

type TUpdateMapperMutationVariables = {
  container: string;
  key: string;
  value: string;
};

/**
 * Encode a string to base64
 */
export const encodeToBase64 = (str: string): string => {
  return btoa(str);
};

/**
 * Decode a base64 string
 */
export const decodeFromBase64 = (base64Str: string): string => {
  return atob(base64Str);
};

export const useProductMappersFetcher = () => {
  const { data, error, loading, refetch } = useMcQuery<
    TFetchProductMappersQuery,
    TFetchProductMappersQueryVariables
  >(FetchProductMappersQuery, {
    variables: {
      container: SHARED_SHOP_CONTAINER_KEY,
      categoryKey: SHARED_SHOP_PRODUCT_TYPE_TO_CATEGORY_KEY,
      skuAttributeKey: SHARED_SHOP_PRODUCT_TYPE_TO_SKU_ATTRIBUTE_KEY,
      productAttributeKey: SHARED_SHOP_PRODUCT_TYPE_TO_PRODUCT_ATTRIBUTE_KEY,
    },
    context: {
      target: GRAPHQL_TARGETS.COMMERCETOOLS_PLATFORM,
    },
  });

  const categoryMap = data?.categoryMap?.value as ProductTypeToCategoryMap;
  const skuAttributeMap = data?.skuAttributeMap
    ?.value as StoredProductTypeToSkuAttributeMap;
  const productAttributeMap = data?.productAttributeMap
    ?.value as StoredProductTypeToProductAttributeMap;

  return {
    categoryMap: categoryMap || {},
    skuAttributeMap: skuAttributeMap || {},
    productAttributeMap: productAttributeMap || {},
    error,
    loading,
    refetch,
  };
};

/**
 * Hook to update mappers
 */
export const useProductMappersUpdater = () => {
  const [updateMapperMutation, { loading }] = useMcMutation<
    TUpdateMapperMutation,
    TUpdateMapperMutationVariables
  >(UpdateMapperMutation);

  const updateCategoryMap = async (map: ProductTypeToCategoryMap) => {
    const result = await updateMapperMutation({
      context: {
        target: GRAPHQL_TARGETS.COMMERCETOOLS_PLATFORM,
      },
      variables: {
        container: SHARED_SHOP_CONTAINER_KEY,
        key: SHARED_SHOP_PRODUCT_TYPE_TO_CATEGORY_KEY,
        value: JSON.stringify(map),
      },
    });

    if (!result.data?.createOrUpdateCustomObject) {
      throw new Error('Failed to update category map');
    }

    return result.data.createOrUpdateCustomObject;
  };

  const updateSkuAttributeMap = async (
    map: StoredProductTypeToSkuAttributeMap
  ) => {
    const result = await updateMapperMutation({
      context: {
        target: GRAPHQL_TARGETS.COMMERCETOOLS_PLATFORM,
      },
      variables: {
        container: SHARED_SHOP_CONTAINER_KEY,
        key: SHARED_SHOP_PRODUCT_TYPE_TO_SKU_ATTRIBUTE_KEY,
        value: JSON.stringify(map),
      },
    });

    if (!result.data?.createOrUpdateCustomObject) {
      throw new Error('Failed to update SKU attribute map');
    }

    return result.data.createOrUpdateCustomObject;
  };

  const updateProductAttributeMap = async (
    map: StoredProductTypeToProductAttributeMap
  ) => {
    const result = await updateMapperMutation({
      context: {
        target: GRAPHQL_TARGETS.COMMERCETOOLS_PLATFORM,
      },
      variables: {
        container: SHARED_SHOP_CONTAINER_KEY,
        key: SHARED_SHOP_PRODUCT_TYPE_TO_PRODUCT_ATTRIBUTE_KEY,
        value: JSON.stringify(map),
      },
    });

    if (!result.data?.createOrUpdateCustomObject) {
      throw new Error('Failed to update product attribute map');
    }

    return result.data.createOrUpdateCustomObject;
  };

  return {
    updateCategoryMap,
    updateSkuAttributeMap,
    updateProductAttributeMap,
    loading,
  };
};
