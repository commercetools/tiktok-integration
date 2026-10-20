import { Request, Response } from 'express';
import {
  CommercetoolsClient,
  CommercetoolsStorage,
  Mappers,
  ProductController,
  RouterService,
  Utils,
} from '../shared';
import { logger } from '../utils/logger.utils';

export const fullProductSync = async (req: Request, res: Response) => {
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

  const products = await ProductController.getAllProducts(apiRoot, shopConfig);

  res.status(200).send('Full sync started...');

  for await (const product of products.results) {
    try {
      const allVariants = [product.masterVariant, ...product.variants];
      const productImages = allVariants
        .map((variant) => variant.images?.map((image) => image.url) ?? [])
        .flat();
      const productDraft =
        await Mappers.Product.commercetoolsProductToTiktokProduct(
          apiRoot,
          product,
        );

      await RouterService.createProduct(
        accessToken,
        shopConfig.shopCipher,
        productDraft,
        productImages,
      );
    } catch (error) {
      logger.error(
        `Full-Sync: Error creating product draft for product ${product.id}`,
      );
      continue;
    }
    logger.info(`Full-Sync: Successfully created product ${product.id}`);
  }
};

export const selectiveProductSync = async (req: Request, res: Response) => {
  const { productIds }: { productIds: string[] } = req.body;
  if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
    return res.status(400).send('Product IDs are required: "productIds"');
  }

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

  const products = await ProductController.queryProduct(apiRoot, {
    limit: productIds.length,
    productIds: productIds,
  });
  if (!products || products.length === 0) {
    return res.status(400).send('No products found');
  }
  res.status(200).send('Selective sync started...');

  logger.info('products', products.length);
  for await (const product of products) {
    try {
      const allVariants = [product.masterVariant, ...product.variants];
      const productImages = allVariants
        .map((variant) => variant.images?.map((image) => image.url) ?? [])
        .flat();
      const productDraft =
        await Mappers.Product.commercetoolsProductToTiktokProduct(
          apiRoot,
          product,
        );

      await RouterService.createProduct(
        accessToken,
        shopConfig.shopCipher,
        productDraft,
        productImages,
      );
    } catch (error) {
      logger.error(
        `Full-Sync: Error creating product draft for product ${product.id}`,
      );
      continue;
    }
    logger.info(`Full-Sync: Successfully created product ${product.id}`);
  }
};

export const fullProductCheck = async (req: Request, res: Response) => {
  const apiRoot = CommercetoolsClient.createApiRoot(Utils.readConfiguration());

  const shopConfig =
    await CommercetoolsStorage.ShopConfigController.getShopConfiguration(
      apiRoot,
    );

  const products = await ProductController.getAllProducts(apiRoot, shopConfig);

  const importableProducts = [];
  const unimportableProducts = [];

  for await (const product of products.results) {
    try {
      await Mappers.Product.commercetoolsProductToTiktokProductCheck(
        apiRoot,
        product,
      );
      importableProducts.push(product.id);
    } catch (error: any) {
      unimportableProducts.push({ id: product.id, error: error.message });
      continue;
    }
  }

  res.status(200).send({ importableProducts, unimportableProducts });
};
