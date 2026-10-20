import { Request, Response } from 'express';
import {
  ChannelController,
  CommercetoolsClient,
  CommercetoolsStorage,
  RouterService,
  StoreController,
  Utils,
} from '../shared';
import { logger } from '../utils/logger.utils';

export const connectProject = async (req: Request, res: Response) => {
  const { shop_doc_id, ct_client_id, ct_client_secret, ct_region } = req.query;

  if (!shop_doc_id) {
    return res.status(401).send('Unauthorized');
  }
  const apiRoot = CommercetoolsClient.createApiRoot(Utils.readConfiguration());

  const serviceUrl =
    await CommercetoolsStorage.ServiceURLController.getServiceURLStorageLink(
      apiRoot,
    );

  let data;
  try {
    data = await RouterService.authorizeProject(
      shop_doc_id as string,
      serviceUrl || '',
      ct_client_id as string,
      ct_client_secret as string,
      ct_region as string,
    );
  } catch (error) {
    logger.error('Failed to authorize project', error);
    return res.status(400).send((error as Error).message);
  }

  res.status(200).send('success');

  await CommercetoolsStorage.TokenController.storeAccessToken(
    apiRoot,
    data.access_token_data,
  );
  logger.info('Token stored successfully for seller');

  // Store JWT token
  if (data.jwt_token && data.jwt_expires_at) {
    await CommercetoolsStorage.TokenController.storeJwtToken(
      apiRoot,
      data.jwt_token,
      data.jwt_expires_at,
    );
    logger.info('JWT token stored successfully');
  } else {
    logger.warn('No JWT token received from router service');
  }
  await CommercetoolsStorage.ShopConfigController.storeShopConfiguration(
    apiRoot,
    {
      isAuthorized: true,
      locale: data.app_map_data.options?.locale as string,
      shop_region: data.app_map_data.options?.shop_region as string,
    },
  );
  logger.info('Shop configuration stored successfully');
  const isInitialized =
    await CommercetoolsStorage.ShopConfigController.isInitialized(apiRoot);
  logger.info('Shop initialized: ${isInitialized}', { isInitialized });
  if (!isInitialized) {
    const isAuthorized =
      await CommercetoolsStorage.ShopConfigController.isAuthorized(apiRoot);
    if (!isAuthorized) {
      throw new Error('App is not authorized to access the shop');
    }

    const stores = await StoreController.findStore(apiRoot, [
      'custom(fields(isTikTokShop=true))',
    ]);
    if (!stores || stores.length === 0) {
      logger.info('No store found');
    }

    const warehouseChannels = await ChannelController.findChannel(apiRoot, [
      'custom(fields(isTikTokWarehouse=true))',
    ]);
    if (!warehouseChannels || warehouseChannels.length === 0) {
      throw new Error('No warehouse channel found');
    }
    if (warehouseChannels.length > 1) {
      throw new Error('Multiple warehouse channels found');
    }

    const warehouses = data.app_map_data.options?.warehouses;
    if (!warehouses || warehouses.length === 0) {
      throw new Error('No warehouses found');
    }

    const tiktokWarehouse = warehouses.find((warehouse: any) =>
      warehouseChannels.find(
        (channel) => channel.custom?.fields.warehouseId === warehouse.id,
      ),
    );

    if (!tiktokWarehouse) {
      throw new Error('No warehouse found');
    }

    const priceChannels = await ChannelController.findChannel(apiRoot, [
      'custom(fields(isTikTokPrice=true))',
    ]);
    if (!priceChannels || priceChannels.length === 0) {
      logger.info('No price channel found');
    }

    const ctStore = stores?.[0];
    const ctWarehouseChannel = warehouseChannels?.[0];
    const ctPriceChannel = priceChannels?.[0];

    if (!ctWarehouseChannel?.custom?.fields.warehouseId) {
      throw new Error('No warehouse ID found in warehouse channel');
    }
    if (!data.app_map_data.options?.shop_cipher) {
      throw new Error('No shop cipher found');
    }
    await CommercetoolsStorage.ShopConfigController.storeShopConfiguration(
      apiRoot,
      {
        shopCipher: data.app_map_data.options?.shop_cipher,
        ctSupplyChannelId: ctWarehouseChannel.id,
        ctDistributionChannelId: ctPriceChannel?.id,
        ctStoreId: ctStore?.id,
        ctStoreKey: ctStore?.key,
      },
    );

    await CommercetoolsStorage.ShopConfigController.storeShopConfiguration(
      apiRoot,
      {
        tiktokWarehouseId: tiktokWarehouse.id,
        tiktokWarehouseEntityId: tiktokWarehouse.entityId,
      },
    );

    await CommercetoolsStorage.ShopConfigController.storeShopConfiguration(
      apiRoot,
      {
        isInitialized: true,
      },
    );

    return {
      success: true,
      message: 'Shop initialized successfully',
    };
  }

  logger.info(
    `Token stored successfully for seller: ${data.app_map_data.options?.seller_name}`,
  );
};
