import { Router } from 'express';
import { Firestore } from '../lib';
import { getFirestoreClient } from '../utils/firestore.utils';
import { logger } from '../utils/logger.utils';

const webhookRouter = Router();

webhookRouter.post('/', async (req, res, next) => {
  try {
    logger.info('webhookRouter', req.body);
    const webhookBody = req.body;
    if (!webhookBody.shop_id) {
      return res.status(400).send('Invalid shop ID');
    }

    const firestore = getFirestoreClient(req);

    const mapping =
      await Firestore.FirestoreController.MapController.getMappingByShopId(
        firestore,
        webhookBody.shop_id,
      );

    if (!mapping) {
      return res.status(400).send('No record found for this shop');
    }

    if (!mapping.service_url) {
      return res.status(400).send('Service URL not found for this shop');
    }

    logger.info('Publishing webhook to service URL');

    const response = await fetch(`${mapping.service_url}/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookBody),
    });

    if (!response.ok) {
      return res.status(500).send('Failed to publish webhook to service URL');
    }

    return res.status(200).send('Webhook message published to service URL');
  } catch (error) {
    logger.error('Error in webhook handler', error);
    next(error);
  }
});

export default webhookRouter;
