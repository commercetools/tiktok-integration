import { AppProjectMapping, TokenResponse } from '../interfaces';
import type {
  Product202309CreateProductResponse,
  Product202309GetAttributesResponse,
  Product202309GetCategoriesResponseDataCategories,
  Product202309GetCategoryRulesResponse,
  Order202507GetOrderDetailResponseDataOrders,
  Order202406AddExternalOrderReferencesRequestBody,
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
  jwt_token: string;
  jwt_expires_at: number;
}

/**
 * Get router service URL from environment variable
 * @returns The router service URL
 */
const getRouterServiceUrl = (): string => {
  const url = process.env.ROUTER_SERVICE_URL_ENDPOINT;

  if (!url) {
    throw new Error(
      'ROUTER_SERVICE_URL_ENDPOINT environment variable is not set',
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
 * Authorize a project with the router service
 * @param shop_doc_id - The shop document ID from Firestore
 * @param service_url - The service URL for callbacks
 * @returns The authorization response data
 */
export const authorizeProject = async (
  shop_doc_id: string,
  service_url: string,
  ct_client_id: string,
  ct_client_secret: string,
  ct_region: string,
): Promise<AuthorizeProjectResponse> => {
  const url = getRouterServiceUrl();

  logger.info('Authorizing project with router service', {
    shop_doc_id,
    project_key: process.env.CTP_PROJECT_KEY as string,
    service_url,
    shop_id: process.env.TIKTOK_SHOP_ID as string,
  });

  const response = await fetch(`${url}/authorize-project`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      shop_doc_id,
      project_key: process.env.CTP_PROJECT_KEY as string,
      service_url,
      shop_id: process.env.TIKTOK_SHOP_ID as string,
      ct_client_id,
      ct_client_secret,
      ct_region,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error('Failed to authorize project with router service', { error });
    throw new Error(`Router service authorization failed: ${error}`);
  }

  const data: AuthorizeProjectResponse = await response.json();

  if (!data || !data.access_token_data || !data.app_map_data) {
    throw new Error(
      'Invalid response from router service: missing required data',
    );
  }

  logger.info('Project authorized successfully with router service');

  return data;
};


/**
 * Authorize a project with the router service
 * @param shop_doc_id - The shop document ID from Firestore
 * @param service_url - The service URL for callbacks
 * @returns The authorization response data
 */
export const getAuthorizationLink = async (
): Promise<string> => {
  const url = getRouterServiceUrl();

  const response = await fetch(`${url}/authorization-link`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error('Failed to get authorization link with router service', { error });
    throw new Error(`Router service get authorization link failed: ${error}`);
  }

  const data: string = await response.text();

  logger.info('Authorization link retrieved successfully with router service');

  return data;
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
  productImages: string[],
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
 * Get categories via router service
 * @param access_token - The TikTok access token
 * @param shop_cipher - The TikTok shop cipher
 * @param options - Optional query parameters
 * @returns The categories response
 */
export const getCategories = async (
  access_token: string,
  shop_cipher: string,
  options?: {
    locale?: string;
    keyword?: string;
    listing_platform?: string;
    include_prohibited_categories?: boolean;
  },
): Promise<Product202309GetCategoriesResponseDataCategories[]> => {
  const baseUrl = getRouterServiceUrl();
  const jwtToken = await getAuthToken();

  logger.info('Getting categories via router service');

  const url = new URL(`${baseUrl}/tiktok/categories`);
  url.searchParams.append('access_token', access_token);
  url.searchParams.append('shop_cipher', shop_cipher);

  if (options?.locale) {
    url.searchParams.append('locale', options.locale);
  }
  if (options?.keyword) {
    url.searchParams.append('keyword', options.keyword);
  }

  if (options?.listing_platform) {
    url.searchParams.append('listing_platform', options.listing_platform);
  }
  if (options?.include_prohibited_categories !== undefined) {
    url.searchParams.append(
      'include_prohibited_categories',
      options.include_prohibited_categories.toString(),
    );
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwtToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    if (response.status === 401) {
      logger.error('Authentication failed with router service', { error });
      throw new Error('Authentication failed. Please re-authorize the project.');
    }
    logger.error('Failed to get categories via router service', { error });
    throw new Error(`Get categories failed: ${error}`);
  }

  const data = await response.json();
  logger.info('Categories retrieved successfully via router service');

  return data;
};

/**
 * Get category rules via router service
 * @param access_token - The TikTok access token
 * @param shop_cipher - The TikTok shop cipher
 * @param category_id - The category ID
 * @param options - Optional query parameters
 * @returns The category rules response
 */
export const getCategoryRules = async (
  access_token: string,
  shop_cipher: string,
  category_id: string,
  options?: {
    category_version?: string;
    locale?: string;
  },
): Promise<Product202309GetCategoryRulesResponse> => {
  const baseUrl = getRouterServiceUrl();
  const jwtToken = await getAuthToken();

  logger.info('Getting category rules via router service', {
    category_id,
  });

  const url = new URL(`${baseUrl}/tiktok/categories/${category_id}/rules`);
  url.searchParams.append('access_token', access_token);
  url.searchParams.append('shop_cipher', shop_cipher);

  if (options?.category_version) {
    url.searchParams.append('category_version', options.category_version);
  }
  if (options?.locale) {
    url.searchParams.append('locale', options.locale);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwtToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    if (response.status === 401) {
      logger.error('Authentication failed with router service', { error });
      throw new Error('Authentication failed. Please re-authorize the project.');
    }
    logger.error('Failed to get category rules via router service', { error });
    throw new Error(`Get category rules failed: ${error}`);
  }

  const data = await response.json();
  logger.info('Category rules retrieved successfully via router service');

  return data;
};

/**
 * Get category attributes via router service
 * @param access_token - The TikTok access token
 * @param shop_cipher - The TikTok shop cipher
 * @param category_id - The category ID
 * @param options - Optional query parameters
 * @returns The category attributes response
 */
export const getCategoryAttributes = async (
  access_token: string,
  shop_cipher: string,
  category_id: string,
  options?: {
    locale?: string;
  },
): Promise<Product202309GetAttributesResponse> => {
  const baseUrl = getRouterServiceUrl();
  const jwtToken = await getAuthToken();

  logger.info('Getting category attributes via router service', {
    category_id,
  });

  const url = new URL(`${baseUrl}/tiktok/categories/${category_id}/attributes`);
  url.searchParams.append('access_token', access_token);
  url.searchParams.append('shop_cipher', shop_cipher);

  if (options?.locale) {
    url.searchParams.append('locale', options.locale);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwtToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    if (response.status === 401) {
      logger.error('Authentication failed with router service', { error });
      throw new Error('Authentication failed. Please re-authorize the project.');
    }
    logger.error('Failed to get category attributes via router service', {
      error,
    });
    throw new Error(`Get category attributes failed: ${error}`);
  }

  const data = await response.json();
  logger.info('Category attributes retrieved successfully via router service');

  return data;
};


/**
 * Get orders via router service
 * @param access_token - The TikTok access token
 * @param shop_cipher - The TikTok shop cipher
 * @param orderIds - Array of order IDs to fetch
 * @returns The orders response
 */
export const getOrders = async (
  access_token: string,
  shop_cipher: string,
  orderIds: string[]
): Promise<Order202507GetOrderDetailResponseDataOrders[]> => {
  const baseUrl = getRouterServiceUrl();
  const jwtToken = await getAuthToken();

  logger.info('Getting orders via router service', {
    access_token: access_token.substring(0, 10) + '...',
    shop_cipher: shop_cipher.substring(0, 10) + '...',
    orderIds,
  });

  const url = new URL(`${baseUrl}/tiktok/orders`);
  url.searchParams.append('access_token', access_token);
  url.searchParams.append('shop_cipher', shop_cipher);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwtToken}`,
    },
    body: JSON.stringify({ orderIds }),
  });

  if (!response.ok) {
    const error = await response.text();
    if (response.status === 401) {
      logger.error('Authentication failed with router service', { error });
      throw new Error('Authentication failed. Please re-authorize the project.');
    }
    logger.error('Failed to get orders via router service', { error });
    throw new Error(`Get orders failed: ${error}`);
  }

  const data = await response.json();
  logger.info('Orders retrieved successfully via router service');

  return data.orders;
};

/**
 * Add external order reference via router service
 * @param access_token - The TikTok access token
 * @param shop_cipher - The TikTok shop cipher
 * @param requestBody - The request body containing order references
 * @returns The response from TikTok API
 */
export const addExternalOrderReference = async (
  access_token: string,
  shop_cipher: string,
  requestBody: any
): Promise<Order202406AddExternalOrderReferencesRequestBody> => {
  const baseUrl = getRouterServiceUrl();
  const jwtToken = await getAuthToken();

  logger.info('Adding external order reference via router service', {
    access_token: access_token.substring(0, 10) + '...',
    shop_cipher: shop_cipher.substring(0, 10) + '...',
  });

  const url = new URL(`${baseUrl}/tiktok/orders/external-reference`);
  url.searchParams.append('access_token', access_token);
  url.searchParams.append('shop_cipher', shop_cipher);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwtToken}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    if (response.status === 401) {
      logger.error('Authentication failed with router service', { error });
      throw new Error('Authentication failed. Please re-authorize the project.');
    }
    logger.error('Failed to add external order reference via router service', {
      error,
    });
    throw new Error(`Add external order reference failed: ${error}`);
  }

  const data = await response.json();
  logger.info('External order reference added successfully via router service');

  return data;
};
