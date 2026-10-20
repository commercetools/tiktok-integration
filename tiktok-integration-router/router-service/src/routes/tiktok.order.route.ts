import express from 'express';
import { TiktokOrder } from '../lib';

export const tiktokOrderRouter = express.Router();

/**
 * POST /
 * Get orders by order IDs
 * Query params: access_token, shop_cipher
 * Body: { orderIds: string[] }
 */
tiktokOrderRouter.post('/', async (req, res) => {
  try {
    const { access_token, shop_cipher } = req.query;
    const { orderIds } = req.body;

    if (!access_token || typeof access_token !== 'string') {
      return res.status(400).json({ error: 'access_token query parameter is required' });
    }

    if (!shop_cipher || typeof shop_cipher !== 'string') {
      return res.status(400).json({ error: 'shop_cipher query parameter is required' });
    }

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ error: 'orderIds array is required in request body' });
    }

    const orders = await TiktokOrder.getOrder(access_token, shop_cipher, orderIds);

    if (!orders) {
      return res.status(404).json({ error: 'No orders found' });
    }

    return res.status(200).json({ orders });
  } catch (error: any) {
    console.error('Error getting orders:', error);
    return res.status(500).json({ 
      error: 'Failed to get orders', 
      message: error.message 
    });
  }
});

/**
 * POST /external-reference
 * Add external order reference
 * Query params: access_token, shop_cipher
 * Body: Order202406AddExternalOrderReferencesRequestBody
 */
tiktokOrderRouter.post('/external-reference', async (req, res) => {
  try {
    const { access_token, shop_cipher } = req.query;
    const requestBody = req.body;

    if (!access_token || typeof access_token !== 'string') {
      return res.status(400).json({ error: 'access_token query parameter is required' });
    }

    if (!shop_cipher || typeof shop_cipher !== 'string') {
      return res.status(400).json({ error: 'shop_cipher query parameter is required' });
    }

    if (!requestBody || !requestBody.orders) {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const result = await TiktokOrder.addExternalOrderReference(
      access_token, 
      shop_cipher, 
      requestBody
    );

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Error adding external order reference:', error);
    return res.status(500).json({ 
      error: 'Failed to add external order reference', 
      message: error.message 
    });
  }
});

