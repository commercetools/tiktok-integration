import { logger } from '../../../utils/logger.utils';
import { client } from './client';

export const getWarehouseList = async (
  access_token: string,
  shop_cipher?: string,
) => {
  const { body } = await client.api.LogisticsV202309Api.WarehousesGet(
    access_token,
    'application/json',
    shop_cipher,
  ).catch((error) => {
    logger.error('Error getting warehouse list', error);
    throw error;
  });
  if (!body?.data) {
    throw new Error('No warehouses found');
  }
  return body.data.warehouses;
};
