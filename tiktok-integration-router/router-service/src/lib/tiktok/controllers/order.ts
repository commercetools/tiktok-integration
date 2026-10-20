import { Order202406AddExternalOrderReferencesRequestBody, Order202507GetOrderDetailResponseDataOrders } from '../../tiktok-sdk';
import { client } from './client';

export const getOrder = async (
  access_token: string,
  shop_cipher: string,
  orderIds: string[],
): Promise<Order202507GetOrderDetailResponseDataOrders[] | undefined> => {
  const { body } = await client.api.OrderV202507Api.OrdersGet(
    orderIds,
    access_token,
    'application/json',
    shop_cipher,
  );
  return body?.data?.orders
};

export const addExternalOrderReference = async (
  access_token: string,
  shop_cipher: string,
  requestBody: Order202406AddExternalOrderReferencesRequestBody,
) => {
  const { body } = await client.api.OrderV202406Api.OrdersExternalOrdersPost(
    access_token,
    'application/json',
    shop_cipher,
    requestBody,
  );
  return body;
};

