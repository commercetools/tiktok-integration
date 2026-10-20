import { Router } from 'express';
import { logger } from '../utils/logger.utils';
import { TiktokProduct } from '../lib';

const tiktokProductRouter = Router();

/**
 * Search products
 * Query params: access_token, shop_cipher, page_size, page_token
 */
tiktokProductRouter.post('/search', async (req, res) => {
  try {
    const { access_token, shop_cipher, page_size, page_token } = req.query;
    
    if (!access_token || !shop_cipher) {
      return res.status(400).send('access_token and shop_cipher are required');
    }

    const result = await TiktokProduct.productSearch(
      access_token as string,
      shop_cipher as string,
      {
        pageSize: page_size ? Number(page_size) : 10,
        pageToken: page_token as string,
      },
      req.body || undefined,
    );

    return res.status(200).json(result);
  } catch (error: any) {
    logger.error('Error searching products', error);
    return res.status(500).send(error.message);
  }
});

/**
 * Get a single product
 * Query params: access_token, shop_cipher, locale, draft
 */
tiktokProductRouter.get('/:product_id', async (req, res) => {
  try {
    const { access_token, shop_cipher, locale, draft } = req.query;
    const { product_id } = req.params;

    if (!access_token || !shop_cipher) {
      return res.status(400).send('access_token and shop_cipher are required');
    }

    const result = await TiktokProduct.getProduct(
      access_token as string,
      shop_cipher as string,
      product_id,
      {
        locale: locale as string,
        draft: draft === 'true',
      },
    );

    return res.status(200).json(result);
  } catch (error: any) {
    logger.error('Error getting product', error);
    return res.status(500).send(error.message);
  }
});

/**
 * Get multiple products by IDs
 * Query params: access_token, shop_cipher, locale, draft
 * Body: { product_ids: string[] }
 */
tiktokProductRouter.post('/batch/get', async (req, res) => {
  try {
    const { access_token, shop_cipher, locale, draft } = req.query;

    if (!access_token || !shop_cipher) {
      return res.status(400).send('access_token and shop_cipher are required');
    }

    if (!req.body || !req.body.product_ids || !Array.isArray(req.body.product_ids)) {
      return res.status(400).send('product_ids array is required in request body');
    }

    const { product_ids } = req.body;

    // Fetch all products in parallel
    const productPromises = product_ids.map((product_id: string) =>
      TiktokProduct.getProduct(
        access_token as string,
        shop_cipher as string,
        product_id,
        {
          locale: locale as string,
          draft: draft === 'true',
        },
      ).catch((error) => {
        logger.error(`Error fetching product ${product_id}`, error);
        return null; // Return null for failed requests
      })
    );

    const products = await Promise.all(productPromises);

    // Filter out null values (failed requests)
    const validProducts = products.filter((product) => product !== null);

    return res.status(200).json(validProducts);
  } catch (error: any) {
    logger.error('Error getting products by IDs', error);
    return res.status(500).send(error.message);
  }
});

/**
 * Check listing prerequisites
 * Query params: access_token, shop_cipher
 */
tiktokProductRouter.get('/prerequisites/check', async (req, res) => {
  try {
    const { access_token, shop_cipher } = req.query;

    if (!access_token || !shop_cipher) {
      return res.status(400).send('access_token and shop_cipher are required');
    }

    const result = await TiktokProduct.checkListingPrerequisites(
      access_token as string,
      shop_cipher as string,
    );

    return res.status(200).json(result);
  } catch (error: any) {
    logger.error('Error checking prerequisites', error);
    return res.status(500).send(error.message);
  }
});

/**
 * Create a product
 * Query params: access_token, shop_cipher
 * Body: Product data
 */
tiktokProductRouter.post('/', async (req, res) => {
  try {
    const { access_token, shop_cipher } = req.query;

    if (!access_token || !shop_cipher) {
      return res.status(400).send('access_token and shop_cipher are required');
    }

    if (!req.body) {
      return res.status(400).send('Product data is required in request body');
    }

    if (!req.body.productData || !req.body.productImages) {
      return res.status(400).send('productData and productImages are required in request body');
    }
    const { productData, productImages } = req.body;

    const mainImages = await TiktokProduct.uploadProductImagesToTiktokMainImages(
      access_token as string,
      productImages,
    );

    const result = await TiktokProduct.createProduct(
      access_token as string,
      shop_cipher as string,
      {
        ...productData,
        mainImages: mainImages,
      }
    );

    return res.status(201).json(result);
  } catch (error: any) {
    logger.error('Error creating product', error);
    return res.status(500).send(error.message);
  }
});

/**
 * Update a product
 * Query params: access_token, shop_cipher
 * Body: Product data
 */
tiktokProductRouter.put('/:product_id', async (req, res) => {
  try {
    const { access_token, shop_cipher } = req.query;
    const { product_id } = req.params;

    if (!access_token || !shop_cipher) {
      return res.status(400).send('access_token and shop_cipher are required');
    }

    if (!req.body) {
      return res.status(400).send('Product data is required in request body');
    }

    const result = await TiktokProduct.updateProduct(
      access_token as string,
      shop_cipher as string,
      product_id,
      req.body,
    );

    return res.status(200).json(result);
  } catch (error: any) {
    logger.error('Error updating product', error);
    return res.status(500).send(error.message);
  }
});

/**
 * Activate a product
 * Query params: access_token, shop_cipher, listing_platforms (optional, comma-separated)
 */
tiktokProductRouter.post('/:product_id/activate', async (req, res) => {
  try {
    const { access_token, shop_cipher, listing_platforms } = req.query;
    const { product_id } = req.params;

    if (!access_token || !shop_cipher) {
      return res.status(400).send('access_token and shop_cipher are required');
    }

    const platforms = listing_platforms
      ? (listing_platforms as string).split(',')
      : undefined;

    const result = await TiktokProduct.activateProduct(
      access_token as string,
      shop_cipher as string,
      product_id,
      platforms,
    );

    return res.status(200).json(result);
  } catch (error: any) {
    logger.error('Error activating product', error);
    return res.status(500).send(error.message);
  }
});

/**
 * Deactivate a product
 * Query params: access_token, shop_cipher
 */
tiktokProductRouter.post('/:product_id/deactivate', async (req, res) => {
  try {
    const { access_token, shop_cipher } = req.query;
    const { product_id } = req.params;

    if (!access_token || !shop_cipher) {
      return res.status(400).send('access_token and shop_cipher are required');
    }

    const result = await TiktokProduct.deactivateProduct(
      access_token as string,
      shop_cipher as string,
      product_id,
    );

    return res.status(200).json(result);
  } catch (error: any) {
    logger.error('Error deactivating product', error);
    return res.status(500).send(error.message);
  }
});

/**
 * Deactivate multiple products
 * Query params: access_token, shop_cipher
 * Body: { product_ids: string[] }
 */
tiktokProductRouter.post('/batch/deactivate', async (req, res) => {
  try {
    const { access_token, shop_cipher } = req.query;

    if (!access_token || !shop_cipher) {
      return res.status(400).send('access_token and shop_cipher are required');
    }

    if (!req.body || !req.body.product_ids) {
      return res.status(400).send('product_ids array is required in request body');
    }

    const result = await TiktokProduct.deactivateProducts(
      access_token as string,
      shop_cipher as string,
      req.body.product_ids,
    );

    return res.status(200).json(result);
  } catch (error: any) {
    logger.error('Error deactivating products', error);
    return res.status(500).send(error.message);
  }
});

/**
 * Delete multiple products
 * Query params: access_token, shop_cipher
 * Body: { product_ids: string[] }
 */
tiktokProductRouter.delete('/batch', async (req, res) => {
  try {
    const { access_token, shop_cipher } = req.query;

    if (!access_token || !shop_cipher) {
      return res.status(400).send('access_token and shop_cipher are required');
    }

    if (!req.body || !req.body.product_ids) {
      return res.status(400).send('product_ids array is required in request body');
    }

    const result = await TiktokProduct.deleteProducts(
      access_token as string,
      shop_cipher as string,
      req.body.product_ids,
    );

    return res.status(200).json(result);
  } catch (error: any) {
    logger.error('Error deleting products', error);
    return res.status(500).send(error.message);
  }
});

/**
 * Publish a product (update and activate)
 * Query params: access_token, shop_cipher
 * Body: Product data
 */
tiktokProductRouter.post('/:product_id/publish', async (req, res) => {
  try {
    const { access_token, shop_cipher } = req.query;
    const { product_id } = req.params;

    if (!access_token || !shop_cipher) {
      return res.status(400).send('access_token and shop_cipher are required');
    }

    if (!req.body) {
      return res.status(400).send('Product data is required in request body');
    }

    const result = await TiktokProduct.publishProduct(
      access_token as string,
      shop_cipher as string,
      product_id,
      req.body,
    );

    return res.status(200).json(result);
  } catch (error: any) {
    logger.error('Error publishing product', error);
    return res.status(500).send(error.message);
  }
});

export default tiktokProductRouter;

