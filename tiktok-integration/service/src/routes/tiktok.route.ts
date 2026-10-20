import { Router } from 'express';
import { logger } from '../utils/logger.utils';
import {
  getCategories,
  getCategoryRules,
  getCategoryAttributes,
} from '../controllers/tiktok.category.controller';

const tiktokRouter = Router();

tiktokRouter.get('/categories', async (req, res) => {
  await getCategories(req, res).catch((error) => {
    logger.error('Error getting categories', error);
    return res.status(500).send(error.message);
  });
});

tiktokRouter.get('/categories/:category_id/rules', async (req, res) => {
  await getCategoryRules(req, res).catch((error) => {
    logger.error('Error getting category rules', error);
    return res.status(500).send(error.message);
  });
});

tiktokRouter.get('/categories/:category_id/attributes', async (req, res) => {
  await getCategoryAttributes(req, res).catch((error) => {
    logger.error('Error getting category attributes', error);
    return res.status(500).send(error.message);
  });
});

export default tiktokRouter;
