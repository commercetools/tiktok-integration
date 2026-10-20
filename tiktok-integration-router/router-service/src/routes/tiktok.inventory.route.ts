import { Router } from 'express';
import { logger } from '../utils/logger.utils';
import { client, TiktokSDK } from '../lib';

const tiktokInventoryRouter = Router();

/**
 * Search inventory
 * Query params: access_token, shop_cipher
 * Body: search query
 */
tiktokInventoryRouter.post('/search', async (req, res) => {
  try {
    const { access_token, shop_cipher } = req.query;

    if (!access_token || !shop_cipher) {
      return res.status(400).send('access_token and shop_cipher are required');
    }

    const { body } = await client.api.ProductV202309Api.InventorySearchPost(
      access_token as string,
      'application/json',
      shop_cipher as string,
      req.body || undefined,
    );

    return res.status(200).json(body.data);
  } catch (error: any) {
    logger.error('Error searching inventory', error);
    return res.status(500).send(error.message);
  }
});

/**
 * Update inventory for a product
 * Query params: access_token, shop_cipher
 * Path params: product_id
 * Body: inventory data
 */
tiktokInventoryRouter.post('/:product_id', async (req, res) => {
  try {
    const { access_token, shop_cipher } = req.query;
    const { product_id } = req.params;

    if (!access_token || !shop_cipher) {
      return res.status(400).send('access_token and shop_cipher are required');
    }

    if (!product_id) {
      return res.status(400).send('product_id is required');
    }

    if (!req.body) {
      return res.status(400).send('Inventory data is required in request body');
    }

    logger.info(`Updating inventory for product ${product_id} in TikTok`);

    const { body } =
      await client.api.ProductV202309Api.ProductsProductIdInventoryUpdatePost(
        product_id,
        access_token as string,
        'application/json',
        shop_cipher as string,
        req.body,
      );

    return res.status(200).json(body);
  } catch (error: any) {
    logger.error('Error updating inventory', error);
    return res.status(500).send(error.message);
  }
});

/**
 * Update inventory for a single SKU
 * Query params: access_token, shop_cipher
 * Path params: product_id, sku_id
 * Body: { inventory: Array<{warehouseId?, quantity?, backorderQuantity?, handlingTime?}> }
 */
tiktokInventoryRouter.post('/:product_id/sku/:sku_id', async (req, res) => {
  try {
    const { access_token, shop_cipher } = req.query;
    const { product_id, sku_id } = req.params;

    if (!access_token || !shop_cipher) {
      return res.status(400).send('access_token and shop_cipher are required');
    }

    if (!product_id) {
      return res.status(400).send('product_id is required');
    }

    if (!sku_id) {
      return res.status(400).send('sku_id is required');
    }

    if (!req.body || !req.body.inventory) {
      return res.status(400).send('inventory array is required in request body');
    }

    const inventoryData: TiktokSDK.Product202309UpdateInventoryRequestBody = {
      skus: [
        {
          id: sku_id,
          inventory: req.body.inventory,
        },
      ],
    };

    logger.info(`Updating inventory for SKU ${sku_id} of product ${product_id} in TikTok`);

    const { body } =
      await client.api.ProductV202309Api.ProductsProductIdInventoryUpdatePost(
        product_id,
        access_token as string,
        'application/json',
        shop_cipher as string,
        inventoryData,
      );

    return res.status(200).json(body);
  } catch (error: any) {
    logger.error('Error updating SKU inventory', error);
    return res.status(500).send(error.message);
  }
});

export default tiktokInventoryRouter;

