import {
  ByProjectKeyRequestBuilder,
  OrderUpdateAction,
} from '@commercetools/platform-sdk';
import { OrderController } from '../commercetools';
import { Order202507GetOrderDetailResponseDataOrders } from '../interfaces/tiktok/models';

export const updateCommercetoolsOrderFromTiktokOrder = async (
  apiRoot: ByProjectKeyRequestBuilder,
  order: Order202507GetOrderDetailResponseDataOrders,
  updateActions: OrderUpdateAction[]
) => {
  const commercetoolsOrder = await OrderController.queryOrder(
    apiRoot,
    `custom(fields(tiktokOrderId="${order.id}"))`
  );
  if (!commercetoolsOrder) {
    throw new Error(`Order ${order.id} not found`);
  }
  const updatedOrder = await OrderController.updateOrder(
    apiRoot,
    commercetoolsOrder.id,
    commercetoolsOrder.version,
    updateActions
  );
  return updatedOrder;
};
