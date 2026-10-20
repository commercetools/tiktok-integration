import { Request, Response } from 'express';
import { logger } from '../utils/logger.utils';
import { CommercetoolsClient, CommercetoolsStorage, RouterService, Utils } from '../shared';

export const getCategories = async (req: Request, res: Response) => {
  const {
    locale,
    keyword,
    listing_platform,
    include_prohibited_categories,
  } = req.query;

  const apiRoot = CommercetoolsClient.createApiRoot(Utils.readConfiguration());

  const shopConfig =
    await CommercetoolsStorage.ShopConfigController.getShopConfiguration(
      apiRoot,
    );

  if (!shopConfig?.shopCipher) {
    return res.status(400).send('Shop cipher not configured');
  }

  const accessToken =
    await CommercetoolsStorage.TokenController.getAccessToken(apiRoot);

  if (!accessToken) {
    return res.status(400).send('Access token not found');
  }

  const categories = await RouterService.getCategories(
    accessToken,
    shopConfig.shopCipher as string,
    {
      locale: locale as string | undefined,
      keyword: keyword as string | undefined,
      listing_platform: listing_platform as string | undefined,
      include_prohibited_categories: include_prohibited_categories === 'true',
    },
  );
  return res.status(200).send(categories);
};

export const getCategoryRules = async (req: Request, res: Response) => {
  const { category_id } = req.params;
  const apiRoot = CommercetoolsClient.createApiRoot(Utils.readConfiguration());

  const shopConfig =
    await CommercetoolsStorage.ShopConfigController.getShopConfiguration(
      apiRoot,
    );

  if (!shopConfig?.shopCipher) {
    return res.status(400).send('Shop cipher not configured');
  }

  const accessToken =
    await CommercetoolsStorage.TokenController.getAccessToken(apiRoot);

  if (!accessToken) {
    return res.status(400).send('Access token not found');
  }

  if (!category_id) {
    logger.error('No category_id found');
    return res.status(400).send('No category_id found');
  }


  const rules = await RouterService.getCategoryRules(
    accessToken,
    shopConfig.shopCipher as string,
    category_id,
    {
      category_version: 'v2',
      locale: shopConfig.locale as string | undefined,
    },
  );
  return res.status(200).send(rules);
};

export const getCategoryAttributes = async (req: Request, res: Response) => {
  const { category_id } = req.params;
  const apiRoot = CommercetoolsClient.createApiRoot(Utils.readConfiguration());

  const shopConfig =
    await CommercetoolsStorage.ShopConfigController.getShopConfiguration(
      apiRoot,
    );

  if (!shopConfig?.shopCipher) {
    return res.status(400).send('Shop cipher not configured');
  }

  const accessToken =
    await CommercetoolsStorage.TokenController.getAccessToken(apiRoot);

  if (!accessToken) {
    return res.status(400).send('Access token not found');
  }

  if (!category_id) {
    logger.error('No category_id found');
    return res.status(400).send('No category_id found');
  }

 

  const attributes = await RouterService.getCategoryAttributes(
    accessToken,
    shopConfig.shopCipher as string,
    category_id,
    {
      locale: shopConfig.locale as string | undefined,
    },
  );
  return res.status(200).send(attributes);
};
