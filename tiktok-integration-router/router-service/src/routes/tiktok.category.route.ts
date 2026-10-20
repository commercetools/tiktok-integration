import { Router } from 'express';
import { logger } from '../utils/logger.utils';
import { TiktokCategory } from '../lib';

const tiktokCategoryRouter = Router();

/**
 * Get categories
 * Query params: access_token, shop_cipher, locale, keyword, listing_platform, include_prohibited_categories
 */
tiktokCategoryRouter.get('/', async (req, res) => {
  try {
    const {
      access_token,
      shop_cipher,
      locale,
      keyword,
      listing_platform,
      include_prohibited_categories,
    } = req.query;

    if (!access_token || !shop_cipher) {
      return res.status(400).send('access_token and shop_cipher are required');
    }

    const result = await TiktokCategory.getCategories(
      access_token as string,
      shop_cipher as string,
      {
        locale: locale as string | undefined,
        keyword: keyword as string | undefined,
        categoryVersion: 'v2',
        listingPlatform: listing_platform as string | undefined,
        includeProhibitedCategories: include_prohibited_categories === 'true',
      },
    );

    return res.status(200).json(result);
  } catch (error: any) {
    logger.error('Error getting categories', error);
    return res.status(500).send(error.message);
  }
});

/**
 * Get category rules
 * Query params: access_token, shop_cipher, category_version, locale
 * Path params: category_id
 */
tiktokCategoryRouter.get('/:category_id/rules', async (req, res) => {
  try {
    const { access_token, shop_cipher, category_version, locale } = req.query;
    const { category_id } = req.params;

    if (!access_token || !shop_cipher) {
      return res.status(400).send('access_token and shop_cipher are required');
    }

    if (!category_id) {
      return res.status(400).send('category_id is required');
    }

    const result = await TiktokCategory.getCategoryRules(
      access_token as string,
      category_id,
      shop_cipher as string,
      {
        categoryVersion: category_version as string | undefined,
        locale: locale as string | undefined,
      },
    );

    return res.status(200).json(result);
  } catch (error: any) {
    logger.error('Error getting category rules', error);
    return res.status(500).send(error.message);
  }
});

/**
 * Get category attributes
 * Query params: access_token, shop_cipher, locale
 * Path params: category_id
 */
tiktokCategoryRouter.get('/:category_id/attributes', async (req, res) => {
  try {
    const { access_token, shop_cipher, locale } = req.query;
    const { category_id } = req.params;

    if (!access_token || !shop_cipher) {
      return res.status(400).send('access_token and shop_cipher are required');
    }

    if (!category_id) {
      return res.status(400).send('category_id is required');
    }

    const result = await TiktokCategory.getCategoryAttributes(
      access_token as string,
      category_id,
      shop_cipher as string,
      {
        locale: locale as string | undefined,
      },
    );

    return res.status(200).json(result);
  } catch (error: any) {
    logger.error('Error getting category attributes', error);
    return res.status(500).send(error.message);
  }
});

export default tiktokCategoryRouter;

