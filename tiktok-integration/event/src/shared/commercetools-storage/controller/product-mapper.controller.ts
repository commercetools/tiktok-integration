import { ByProjectKeyRequestBuilder } from '@commercetools/platform-sdk/dist/declarations/src/generated/client/by-project-key-request-builder';
import {
  SHARED_SHOP_CONTAINER_KEY,
  SHARED_SHOP_PRODUCT_TYPE_TO_CATEGORY_KEY,
  SHARED_SHOP_PRODUCT_TYPE_TO_SKU_ATTRIBUTE_KEY,
  SHARED_SHOP_PRODUCT_TYPE_TO_PRODUCT_ATTRIBUTE_KEY,
} from '../../constants';
import {
  ProductTypeToCategoryMap,
  StoredProductTypeToSkuAttributeMap,
  StoredProductTypeToProductAttributeMap,
  ProductTypeToSkuAttributeMap,
  ProductTypeToProductAttributeMap,
  TikTokSkuAttributeMapper,
  TikTokProductAttributeMapper,
  StoredTikTokSkuAttributeMapper,
  StoredTikTokProductAttributeMapper,
} from '../../interfaces';
import {
  createOrUpdateCustomObject,
  readCustomObject,
} from '../../commercetools/controllers/custom-object.controller';
import { logger } from '../../utils/logger';

/**
 * Encode a function to base64 string
 */
export const encodeFunctionToBase64 = (fn: Function): string => {
  const functionString = fn.toString();
  return Buffer.from(functionString).toString('base64');
};

/**
 * Decode a base64 string to a function
 */
export const decodeFunctionFromBase64 = <T extends Function>(
  base64String: string
): T => {
  const functionString = Buffer.from(base64String, 'base64').toString('utf-8');
  // Use eval to reconstruct the function
  // eslint-disable-next-line no-eval
  return eval(`(${functionString})`) as T;
};

/**
 * Convert stored SKU attribute mapper to runtime mapper
 */
const convertStoredSkuAttributeMapper = (
  stored: StoredTikTokSkuAttributeMapper
): TikTokSkuAttributeMapper => {
  const runtime: TikTokSkuAttributeMapper = {
    name: stored.name,
    tiktokAttributeId: stored.tiktokAttributeId,
  };

  if (stored.valueNameFetcher) {
    try {
      runtime.valueNameFetcher = decodeFunctionFromBase64(
        stored.valueNameFetcher
      );
    } catch (error) {
      logger.error('Error decoding valueNameFetcher', error);
    }
  }

  if (stored.valueIdFetcher) {
    try {
      runtime.valueIdFetcher = decodeFunctionFromBase64(stored.valueIdFetcher);
    } catch (error) {
      logger.error('Error decoding valueIdFetcher', error);
    }
  }

  return runtime;
};

/**
 * Convert runtime SKU attribute mapper to stored mapper
 */
const convertRuntimeSkuAttributeMapper = (
  runtime: TikTokSkuAttributeMapper
): StoredTikTokSkuAttributeMapper => {
  const stored: StoredTikTokSkuAttributeMapper = {
    name: runtime.name,
    tiktokAttributeId: runtime.tiktokAttributeId,
  };

  if (runtime.valueNameFetcher) {
    stored.valueNameFetcher = encodeFunctionToBase64(runtime.valueNameFetcher);
  }

  if (runtime.valueIdFetcher) {
    stored.valueIdFetcher = encodeFunctionToBase64(runtime.valueIdFetcher);
  }

  return stored;
};

/**
 * Convert stored product attribute mapper to runtime mapper
 */
const convertStoredProductAttributeMapper = (
  stored: StoredTikTokProductAttributeMapper
): TikTokProductAttributeMapper => {
  const runtime: TikTokProductAttributeMapper = {
    name: stored.name,
    tiktokAttributeId: stored.tiktokAttributeId,
  };

  if (stored.valueNamesFetcher) {
    try {
      runtime.valueNamesFetcher = decodeFunctionFromBase64(
        stored.valueNamesFetcher
      );
    } catch (error) {
      logger.error('Error decoding valueNamesFetcher', error);
    }
  }

  if (stored.valueIdsFetcher) {
    try {
      runtime.valueIdsFetcher = decodeFunctionFromBase64(
        stored.valueIdsFetcher
      );
    } catch (error) {
      logger.error('Error decoding valueIdsFetcher', error);
    }
  }

  return runtime;
};

/**
 * Convert runtime product attribute mapper to stored mapper
 */
const convertRuntimeProductAttributeMapper = (
  runtime: TikTokProductAttributeMapper
): StoredTikTokProductAttributeMapper => {
  const stored: StoredTikTokProductAttributeMapper = {
    name: runtime.name,
    tiktokAttributeId: runtime.tiktokAttributeId,
  };

  if (runtime.valueNamesFetcher) {
    stored.valueNamesFetcher = encodeFunctionToBase64(
      runtime.valueNamesFetcher
    );
  }

  if (runtime.valueIdsFetcher) {
    stored.valueIdsFetcher = encodeFunctionToBase64(runtime.valueIdsFetcher);
  }

  return stored;
};

/**
 * Get product type to category mapping from custom objects
 */
export const getProductTypeToCategoryMap = async (
  apiRoot: ByProjectKeyRequestBuilder
): Promise<ProductTypeToCategoryMap> => {
  try {
    const map = await readCustomObject<ProductTypeToCategoryMap>(
      apiRoot,
      SHARED_SHOP_CONTAINER_KEY,
      SHARED_SHOP_PRODUCT_TYPE_TO_CATEGORY_KEY
    );
    return map || {};
  } catch (error) {
    logger.error('Error reading product type to category map', error);
    return {};
  }
};

/**
 * Save product type to category mapping to custom objects
 */
export const saveProductTypeToCategoryMap = async (
  apiRoot: ByProjectKeyRequestBuilder,
  map: ProductTypeToCategoryMap
): Promise<void> => {
  try {
    await createOrUpdateCustomObject(
      apiRoot,
      SHARED_SHOP_CONTAINER_KEY,
      SHARED_SHOP_PRODUCT_TYPE_TO_CATEGORY_KEY,
      map
    );
    logger.info('Product type to category map saved successfully');
  } catch (error) {
    logger.error('Error saving product type to category map', error);
    throw error;
  }
};

/**
 * Get product type to SKU attribute mapping from custom objects
 */
export const getProductTypeToSkuAttributeMap = async (
  apiRoot: ByProjectKeyRequestBuilder
): Promise<ProductTypeToSkuAttributeMap> => {
  try {
    const storedMap = await readCustomObject<StoredProductTypeToSkuAttributeMap>(
      apiRoot,
      SHARED_SHOP_CONTAINER_KEY,
      SHARED_SHOP_PRODUCT_TYPE_TO_SKU_ATTRIBUTE_KEY
    );

    if (!storedMap) {
      return {};
    }

    // Convert stored map to runtime map
    const runtimeMap: ProductTypeToSkuAttributeMap = {};
    for (const [productTypeId, mappers] of Object.entries(storedMap)) {
      runtimeMap[productTypeId] = mappers.map(convertStoredSkuAttributeMapper);
    }

    return runtimeMap;
  } catch (error) {
    logger.error('Error reading product type to SKU attribute map', error);
    return {};
  }
};

/**
 * Save product type to SKU attribute mapping to custom objects
 */
export const saveProductTypeToSkuAttributeMap = async (
  apiRoot: ByProjectKeyRequestBuilder,
  map: ProductTypeToSkuAttributeMap
): Promise<void> => {
  try {
    // Convert runtime map to stored map
    const storedMap: StoredProductTypeToSkuAttributeMap = {};
    for (const [productTypeId, mappers] of Object.entries(map)) {
      storedMap[productTypeId] = mappers.map(
        convertRuntimeSkuAttributeMapper
      );
    }

    await createOrUpdateCustomObject(
      apiRoot,
      SHARED_SHOP_CONTAINER_KEY,
      SHARED_SHOP_PRODUCT_TYPE_TO_SKU_ATTRIBUTE_KEY,
      storedMap
    );
    logger.info('Product type to SKU attribute map saved successfully');
  } catch (error) {
    logger.error('Error saving product type to SKU attribute map', error);
    throw error;
  }
};

/**
 * Get product type to product attribute mapping from custom objects
 */
export const getProductTypeToProductAttributeMap = async (
  apiRoot: ByProjectKeyRequestBuilder
): Promise<ProductTypeToProductAttributeMap> => {
  try {
    const storedMap =
      await readCustomObject<StoredProductTypeToProductAttributeMap>(
        apiRoot,
        SHARED_SHOP_CONTAINER_KEY,
        SHARED_SHOP_PRODUCT_TYPE_TO_PRODUCT_ATTRIBUTE_KEY
      );

    if (!storedMap) {
      return {};
    }

    // Convert stored map to runtime map
    const runtimeMap: ProductTypeToProductAttributeMap = {};
    for (const [productTypeId, mappers] of Object.entries(storedMap)) {
      runtimeMap[productTypeId] = mappers.map(
        convertStoredProductAttributeMapper
      );
    }

    return runtimeMap;
  } catch (error) {
    logger.error('Error reading product type to product attribute map', error);
    return {};
  }
};

/**
 * Save product type to product attribute mapping to custom objects
 */
export const saveProductTypeToProductAttributeMap = async (
  apiRoot: ByProjectKeyRequestBuilder,
  map: ProductTypeToProductAttributeMap
): Promise<void> => {
  try {
    // Convert runtime map to stored map
    const storedMap: StoredProductTypeToProductAttributeMap = {};
    for (const [productTypeId, mappers] of Object.entries(map)) {
      storedMap[productTypeId] = mappers.map(
        convertRuntimeProductAttributeMapper
      );
    }

    await createOrUpdateCustomObject(
      apiRoot,
      SHARED_SHOP_CONTAINER_KEY,
      SHARED_SHOP_PRODUCT_TYPE_TO_PRODUCT_ATTRIBUTE_KEY,
      storedMap
    );
    logger.info('Product type to product attribute map saved successfully');
  } catch (error) {
    logger.error('Error saving product type to product attribute map', error);
    throw error;
  }
};

