import * as http from 'http';
import * as https from 'https';
import {
  Product202309ActivateProductRequestBody,
  Product202309CreateProductRequestBody,
  Product202309CreateProductRequestBodyMainImages,
  Product202309DeactivateProductsRequestBody,
  Product202309DeleteProductsRequestBody,
  Product202309EditProductRequestBody,
  Product202309GetProductResponseData,
  Product202502SearchProductsRequestBody,
  Product202502SearchProductsResponseData
} from '../../tiktok-sdk';
import { RequestFile } from '../../tiktok-sdk/api/apis';
import { logger } from '../../../utils/logger.utils';
import { client } from './client';

export const productSearch = async (
  access_token: string,
  shopCipher: string,
  page?: {
    pageSize: number;
    pageToken?: string;
  },
  query?: Product202502SearchProductsRequestBody,
): Promise<Product202502SearchProductsResponseData | undefined> => {
  const { body } = await client.api.ProductV202502Api.ProductsSearchPost(
    page?.pageSize ?? 10,
    access_token,
    'application/json',
    page?.pageToken ?? undefined,
    shopCipher,
    query ?? undefined,
  );
  return body.data;
};

export const getProduct = async (
  access_token: string,
  shopCipher: string,
  product_id: string,
  options?: {
    locale?: string;
    draft?: boolean;
  },
): Promise<Product202309GetProductResponseData | undefined> => {
  const { body } = await client.api.ProductV202309Api.ProductsProductIdGet(
    product_id,
    access_token,
    'application/json',
    false,
    !!options?.draft,
    options?.locale,
    shopCipher,
  );
  return body.data;
};

export const checkListingPrerequisites = async (
  access_token: string,
  shopCipher: string,
) => {
  const { body } = await client.api.ProductV202309Api.PrerequisitesGet(
    access_token,
    'application/json',
    shopCipher,
  );
  if (!body.data || !body.data.shop) {
    throw new Error('No data found in CheckListingPrerequisitesResponse');
  }
  const { shop } = body.data;
  const shopRes = Object.entries(shop).reduce(
    (acc, [key, value]) => {
      if (typeof value === 'string') {
        acc[key] = JSON.parse(value);
      } else {
        acc[key] = value;
      }
      return acc;
    },
    {} as Record<string, any>,
  );

  return shopRes;
};

/**
 * Fetches an image from a URL and converts it to a Buffer
 */
const fetchImageFromUrl = async (imageUrl: string): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const protocol = imageUrl.startsWith('https') ? https : http;

    protocol
      .get(imageUrl, (response) => {
        if (response.statusCode !== 200) {
          reject(
            new Error(
              `Failed to fetch image: ${response.statusCode} ${response.statusMessage}`,
            ),
          );
          return;
        }

        const chunks: Buffer[] = [];

        response.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        response.on('end', () => {
          resolve(Buffer.concat(chunks));
        });
      })
      .on('error', (error) => {
        reject(new Error(`Failed to fetch image from URL: ${error.message}`));
      });
  });
};

/**
 * Extracts filename from URL or generates a default one
 */
const getFilenameFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split('/').pop() || 'image.jpg';
    return filename;
  } catch {
    return 'image.jpg';
  }
};

/**
 * Determines content type from filename extension
 */
const getContentTypeFromFilename = (filename: string): string => {
  const ext = filename.toLowerCase().split('.').pop();
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
  };
  return mimeTypes[ext || 'jpg'] || 'image/jpeg';
};


export const uploadProductImagesToTiktokMainImages = async (
  access_token: string,
  productImages: string[],
): Promise<Product202309CreateProductRequestBodyMainImages[] | undefined> => {
  
  const mainImages = [];
  // TODO: Promise.all
  for await (const image of productImages ?? []) {
    const resultUploadImage = await uploadProductImage(
      access_token,
      image,
      'MAIN_IMAGE',
    );
    if (!resultUploadImage) {
      throw new Error('Failed to upload product image');
    }

    mainImages.push(resultUploadImage.data?.uri);
  }
  return mainImages
    .filter((image) => image !== undefined)
    .map((image) => ({
      uri: image,
    }));
};

export const uploadProductImage = async (
  access_token: string,
  imageUrl: string,
  useCase?: string,
) => {
  // Fetch the image from the URL
  const imageBuffer = await fetchImageFromUrl(imageUrl);

  // Extract filename and content type
  const filename = getFilenameFromUrl(imageUrl);
  const contentType = getContentTypeFromFilename(filename);

  // Create RequestFile object
  const imageFile: RequestFile = {
    value: imageBuffer,
    options: {
      filename: filename,
      contentType: contentType,
    },
  };

  const { body } = await client.api.ProductV202309Api.ImagesUploadPost(
    access_token,
    'multipart/form-data',
    imageFile,
    useCase,
  );
  return body;
};

export const createProduct = async (
  access_token: string,
  shopCipher: string,
  productData: Product202309CreateProductRequestBody,
) => {
  const { body } = await client.api.ProductV202309Api.ProductsPost(
    access_token,
    'application/json',
    shopCipher,
    productData,
  ).catch((error) => {
    logger.error('Error creating product in Tiktok', error);
    throw error;
  });
  return body;
};

export const updateProduct = async (
  access_token: string,
  shopCipher: string,
  product_id: string,
  productData: Product202309EditProductRequestBody,
) => {
  const { body } = await client.api.ProductV202509Api.ProductsProductIdPut(
    product_id,
    access_token,
    'application/json',
    shopCipher,
    productData,
  );
  return body;
};

export const activateProduct = async (
  access_token: string,
  shopCipher: string,
  product_id: string,
  listing_platforms?: string[],
) => {
  const requestBody: Product202309ActivateProductRequestBody = {
    productIds: [product_id],
    listingPlatforms: listing_platforms,
  };

  const { body } = await client.api.ProductV202309Api.ProductsActivatePost(
    access_token,
    'application/json',
    shopCipher,
    requestBody,
  );
  return body;
};

export const deactivateProduct = async (
  access_token: string,
  shopCipher: string,
  product_id: string,
) => {
  logger.info(`Deactivating product ${product_id} in TikTok`);

  const requestBody: Product202309DeactivateProductsRequestBody = {
    productIds: [product_id],
  };

  const { body } = await client.api.ProductV202309Api.ProductsDeactivatePost(
    access_token,
    'application/json',
    shopCipher,
    requestBody,
  );

  return body;
};

export const deactivateProducts = async (
  access_token: string,
  shopCipher: string,
  product_ids: string[],
) => {
  if (!product_ids || product_ids.length === 0) {
    throw new Error('At least one product ID is required');
  }

  if (product_ids.length > 20) {
    throw new Error('Maximum 20 product IDs allowed per request');
  }

  logger.info(`Deactivating ${product_ids.length} products in TikTok`);

  const requestBody: Product202309DeactivateProductsRequestBody = {
    productIds: product_ids,
  };

  const { body } = await client.api.ProductV202309Api.ProductsDeactivatePost(
    access_token,
    'application/json',
    shopCipher,
    requestBody,
  );

  return body;
};

export const deleteProducts = async (
  access_token: string,
  shopCipher: string,
  product_ids: string[],
) => {
  if (!product_ids || product_ids.length === 0) {
    throw new Error('At least one product ID is required');
  }

  if (product_ids.length > 20) {
    throw new Error('Maximum 20 product IDs allowed per request');
  }

  logger.info(`Deleting ${product_ids.length} products in TikTok`);

  const requestBody: Product202309DeleteProductsRequestBody = {
    productIds: product_ids,
  };

  const { body } = await client.api.ProductV202309Api.ProductsDelete(
    access_token,
    'application/json',
    shopCipher,
    requestBody,
  );

  return body;
};

export const publishProduct = async (
  access_token: string,
  shopCipher: string,
  productId?: string,
  product?: Product202309EditProductRequestBody,
) => {
  if (!productId) {
    throw new Error('Product with ID is required');
  }
  if (!product) {
    throw new Error('Product data is required');
  }

  logger.info(`Publishing product ${productId} in Tiktok`);

  const result = await updateProduct(access_token, shopCipher, productId, product);
  if (!result) {
    throw new Error('Failed to update product');
  }
  return result;
};
