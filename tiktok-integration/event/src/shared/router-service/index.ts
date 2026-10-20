import { AppProjectMapping, TokenResponse } from '../interfaces';
import type {
  Product202309CreateProductResponse,
  Product202309DeactivateProductsResponse,
  Product202309DeleteProductsResponse,
  Product202309GetProductResponseData,
  Product202309UpdateInventoryResponse,
  Product202502SearchProductsResponseData,
  Product202509EditProductResponse
} from '../interfaces/tiktok/models';
import { logger } from '../utils/logger';
import { createApiRoot } from '../commercetools/client/create.client';
import { readConfiguration } from '../utils/config.utils';
import { getJwtToken } from '../commercetools-storage/controller/token.controller';

/**
 * Response type from router service authorize-project endpoint
 */
export interface AuthorizeProjectResponse {
  access_token_data: TokenResponse;
  app_map_data: AppProjectMapping;
}

/**
 * Get router service URL from environment variable
 * @returns The router service URL
 */
const getRouterServiceUrl = (): string => {
  const url = process.env.ROUTER_SERVICE_URL_ENDPOINT;

  if (!url) {
    throw new Error(
      'ROUTER_SERVICE_URL_ENDPOINT environment variable is not set'
    );
  }

  return url;
};

/**
 * Get JWT token for authenticating with router service
 * @returns The JWT token
 * @throws Error if JWT token is not available
 */
const getAuthToken = async (): Promise<string> => {
  try {
    const config = readConfiguration();
    const apiRoot = createApiRoot(config);
    const token = await getJwtToken(apiRoot);

    if (!token) {
      throw new Error('JWT token not available. Please authorize the project first.');
    }

    return token;
  } catch (error) {
    logger.error('Failed to get JWT token', error);
    throw new Error('Failed to authenticate with router service: ' + (error as Error).message);
  }
};

/**
 * Create a product via router service
 * @param access_token - The TikTok access token
 * @param shop_cipher - The TikTok shop cipher
 * @param productData - The product data to create
 * @param productImages - The product images to create
 * @returns The created product response
 */
export const createProduct = async (
  access_token: string,
  shop_cipher: string,
  productData: any,
  productImages: string[]
): Promise<Product202309CreateProductResponse> => {
  const baseUrl = getRouterServiceUrl();
  const jwtToken = await getAuthToken();

  logger.info('Creating product via router service', {
    access_token: access_token.substring(0, 10) + '...',
    shop_cipher: shop_cipher.substring(0, 10) + '...',
  });

  const url = new URL(`${baseUrl}/tiktok/products`);
  url.searchParams.append('access_token', access_token);
  url.searchParams.append('shop_cipher', shop_cipher);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwtToken}`,
    },
    body: JSON.stringify({ productData, productImages }),
  });

  if (!response.ok) {
    const error = await response.text();
    if (response.status === 401) {
      logger.error('Authentication failed with router service', { error });
      throw new Error('Authentication failed. Please re-authorize the project.');
    }
    logger.error('Failed to create product via router service', { error });
    throw new Error(`Product creation failed: ${error}`);
  }

  const data = await response.json();
  logger.info('Product created successfully via router service');

  return data;
};



/**
 * Search products via router service
 * @param access_token - The TikTok access token
 * @param shop_cipher - The TikTok shop cipher
 * @param options - Optional pagination options
 * @param searchQuery - Optional search query body
 * @returns The product search response
 */
export const productSearch = async (
  access_token: string,
  shop_cipher: string,
  options?: {
    pageSize?: number;
    pageToken?: string;
  },
  searchQuery?: any
): Promise<Product202502SearchProductsResponseData | undefined> => {
  const baseUrl = getRouterServiceUrl();
  const jwtToken = await getAuthToken();

  logger.info('Searching products via router service');

  const url = new URL(`${baseUrl}/tiktok/products/search`);
  url.searchParams.append('access_token', access_token);
  url.searchParams.append('shop_cipher', shop_cipher);

  if (options?.pageSize) {
    url.searchParams.append('page_size', options.pageSize.toString());
  }
  if (options?.pageToken) {
    url.searchParams.append('page_token', options.pageToken);
  }

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwtToken}`,
    },
    body: searchQuery ? JSON.stringify(searchQuery) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    if (response.status === 401) {
      logger.error('Authentication failed with router service', { error });
      throw new Error('Authentication failed. Please re-authorize the project.');
    }
    logger.error('Failed to search products via router service', { error });
    throw new Error(`Product search failed: ${error}`);
  }

  const data = await response.json();
  logger.info('Products searched successfully via router service');

  return data;
};

/**
 * Get multiple products by IDs via router service
 * @param access_token - The TikTok access token
 * @param shop_cipher - The TikTok shop cipher
 * @param product_ids - Array of product IDs to fetch
 * @param options - Optional query parameters
 * @returns The products response with metadata
 */
export const getProductsByIds = async (
  access_token: string,
  shop_cipher: string,
  product_ids: string[],
  options?: {
    locale?: string;
    draft?: boolean;
  }
): Promise<(Product202309GetProductResponseData | undefined)[]> => {
  const baseUrl = getRouterServiceUrl();
  const jwtToken = await getAuthToken();

  logger.info('Getting products by IDs via router service', {
    access_token: access_token.substring(0, 10) + '...',
    shop_cipher: shop_cipher.substring(0, 10) + '...',
    product_count: product_ids.length,
  });

  const url = new URL(`${baseUrl}/tiktok/products/batch/get`);
  url.searchParams.append('access_token', access_token);
  url.searchParams.append('shop_cipher', shop_cipher);

  if (options?.locale) {
    url.searchParams.append('locale', options.locale);
  }
  if (options?.draft !== undefined) {
    url.searchParams.append('draft', options.draft.toString());
  }

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwtToken}`,
    },
    body: JSON.stringify({ product_ids }),
  });

  if (!response.ok) {
    const error = await response.text();
    if (response.status === 401) {
      logger.error('Authentication failed with router service', { error });
      throw new Error('Authentication failed. Please re-authorize the project.');
    }
    logger.error('Failed to get products by IDs via router service', { error });
    throw new Error(`Get products by IDs failed: ${error}`);
  }

  const data = await response.json();
  logger.info('Products retrieved successfully via router service', {
    total: data.total,
    requested: data.requested,
  });

  return data;
};

/**
 * Update inventory via router service
 * @param access_token - The TikTok access token
 * @param shop_cipher - The TikTok shop cipher
 * @param product_id - The product ID
 * @param inventoryData - The inventory data to update
 * @returns The update inventory response
 */
export const updateInventory = async (
  access_token: string,
  shop_cipher: string,
  product_id: string,
  inventoryData: any
): Promise<Product202309UpdateInventoryResponse> => {
  const baseUrl = getRouterServiceUrl();
  const jwtToken = await getAuthToken();

  logger.info('Updating inventory via router service', {
    access_token: access_token.substring(0, 10) + '...',
    shop_cipher: shop_cipher.substring(0, 10) + '...',
    product_id,
  });

  const url = new URL(`${baseUrl}/tiktok/inventory/${product_id}`);
  url.searchParams.append('access_token', access_token);
  url.searchParams.append('shop_cipher', shop_cipher);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwtToken}`,
    },
    body: JSON.stringify(inventoryData),
  });

  if (!response.ok) {
    const error = await response.text();
    if (response.status === 401) {
      logger.error('Authentication failed with router service', { error });
      throw new Error('Authentication failed. Please re-authorize the project.');
    }
    logger.error('Failed to update inventory via router service', { error });
    throw new Error(`Inventory update failed: ${error}`);
  }

  const data = await response.json();
  logger.info('Inventory updated successfully via router service');

  return data;
};


/**
 * Publish a product via router service (update and activate)
 * @param access_token - The TikTok access token
 * @param shop_cipher - The TikTok shop cipher
 * @param product_id - The product ID to publish
 * @param productData - The product data to update
 * @returns The publish product response
 */
export const publishProduct = async (
  access_token: string,
  shop_cipher: string,
  product_id: string,
  productData: any
): Promise<Product202509EditProductResponse> => {
  const baseUrl = getRouterServiceUrl();
  const jwtToken = await getAuthToken();

  logger.info('Publishing product via router service', {
    access_token: access_token.substring(0, 10) + '...',
    shop_cipher: shop_cipher.substring(0, 10) + '...',
    product_id,
  });

  const url = new URL(`${baseUrl}/tiktok/products/${product_id}/publish`);
  url.searchParams.append('access_token', access_token);
  url.searchParams.append('shop_cipher', shop_cipher);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwtToken}`,
    },
    body: JSON.stringify(productData),
  });

  if (!response.ok) {
    const error = await response.text();
    if (response.status === 401) {
      logger.error('Authentication failed with router service', { error });
      throw new Error('Authentication failed. Please re-authorize the project.');
    }
    logger.error('Failed to publish product via router service', { error });
    throw new Error(`Product publish failed: ${error}`);
  }

  const data = await response.json();
  logger.info('Product published successfully via router service');

  return data;
};

/**
 * Deactivate multiple products via router service
 * @param access_token - The TikTok access token
 * @param shop_cipher - The TikTok shop cipher
 * @param product_ids - Array of product IDs to deactivate
 * @returns The deactivate products response
 */
export const deactivateProducts = async (
  access_token: string,
  shop_cipher: string,
  product_ids: string[]
): Promise<Product202309DeactivateProductsResponse> => {
  const baseUrl = getRouterServiceUrl();
  const jwtToken = await getAuthToken();

  logger.info('Deactivating products via router service', {
    access_token: access_token.substring(0, 10) + '...',
    shop_cipher: shop_cipher.substring(0, 10) + '...',
    product_count: product_ids.length,
  });

  const url = new URL(`${baseUrl}/tiktok/products/batch/deactivate`);
  url.searchParams.append('access_token', access_token);
  url.searchParams.append('shop_cipher', shop_cipher);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwtToken}`,
    },
    body: JSON.stringify({ product_ids }),
  });

  if (!response.ok) {
    const error = await response.text();
    if (response.status === 401) {
      logger.error('Authentication failed with router service', { error });
      throw new Error('Authentication failed. Please re-authorize the project.');
    }
    logger.error('Failed to deactivate products via router service', { error });
    throw new Error(`Products deactivation failed: ${error}`);
  }

  const data = await response.json();
  logger.info('Products deactivated successfully via router service');

  return data;
};

/**
 * Delete multiple products via router service
 * @param access_token - The TikTok access token
 * @param shop_cipher - The TikTok shop cipher
 * @param product_ids - Array of product IDs to delete
 * @returns The delete products response
 */
export const deleteProducts = async (
  access_token: string,
  shop_cipher: string,
  product_ids: string[]
): Promise<Product202309DeleteProductsResponse> => {
  const baseUrl = getRouterServiceUrl();
  const jwtToken = await getAuthToken();

  logger.info('Deleting products via router service', {
    access_token: access_token.substring(0, 10) + '...',
    shop_cipher: shop_cipher.substring(0, 10) + '...',
    product_count: product_ids.length,
  });

  const url = new URL(`${baseUrl}/tiktok/products/batch`);
  url.searchParams.append('access_token', access_token);
  url.searchParams.append('shop_cipher', shop_cipher);

  const response = await fetch(url.toString(), {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwtToken}`,
    },
    body: JSON.stringify({ product_ids }),
  });

  if (!response.ok) {
    const error = await response.text();
    if (response.status === 401) {
      logger.error('Authentication failed with router service', { error });
      throw new Error('Authentication failed. Please re-authorize the project.');
    }
    logger.error('Failed to delete products via router service', { error });
    throw new Error(`Products deletion failed: ${error}`);
  }

  const data = await response.json();
  logger.info('Products deleted successfully via router service');

  return data;
};

/**
 * Publish webhook configuration via router service
 * @param project_key - The commercetools project key
 * @param pubsub_topic - The Google Cloud Pub/Sub topic
 * @param pubsub_project - The Google Cloud Pub/Sub project
 * @returns Success message
 */
export const publishWebhook = async (
  project_key: string,
  pubsub_topic: string,
  pubsub_project: string
): Promise<string> => {
  const url = getRouterServiceUrl();

  logger.info('Publishing webhook via router service', {
    project_key,
    pubsub_topic,
    pubsub_project,
  });

  const response = await fetch(`${url}/publish-webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      project_key,
      pubsub_topic,
      pubsub_project,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error('Failed to publish webhook via router service', { error });
    throw new Error(`Webhook publish failed: ${error}`);
  }

  const data = await response.text();
  logger.info('Webhook published successfully via router service');

  return data;
};
