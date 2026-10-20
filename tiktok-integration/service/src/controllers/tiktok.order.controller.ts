import {
  CommercetoolsClient,
  CommercetoolsStorage,
  Mappers,
  OrderController,
  RouterService,
  Services,
  Utils,
} from '../shared';
import { logger } from '../utils/logger.utils';
import { ByProjectKeyRequestBuilder } from '@commercetools/platform-sdk';
import type { Types } from '../shared';
import { TiktokWebhookOrderStatusChangeMessageType } from './webhook.controller';

export const orderStatusChange = async (
  webhookBody: TiktokWebhookOrderStatusChangeMessageType
) => {
  const orderId = webhookBody.data.order_id;
  const apiRoot = CommercetoolsClient.createApiRoot(Utils.readConfiguration());
  const commercetoolsLocale = await Services.getCommercetoolsLocale(apiRoot);
  const accessToken =
    await CommercetoolsStorage.TokenController.getAccessToken(apiRoot);
  const config =
    await CommercetoolsStorage.ShopConfigController.getShopConfiguration(
      apiRoot
    );
  if (!accessToken || !config?.shopCipher) {
    throw new Error('No access token found');
  }

  const orders = await RouterService.getOrders(accessToken, config.shopCipher, [
    orderId,
  ]);

  if (!orders || orders.length === 0) {
    throw new Error('No orders found');
  }

  switch (webhookBody.data.order_status) {
    case 'UNPAID':
      await handleUnpaidOrder(
        apiRoot,
        orders,
        accessToken,
        config,
        commercetoolsLocale
      );
      break;

    case 'ON_HOLD':
      await handleOnHoldOrder(
        apiRoot,
        orders,
        accessToken,
        config,
        commercetoolsLocale
      );
      break;

    case 'AWAITING_SHIPMENT':
      await handleAwaitingShipmentOrder(apiRoot, orders);
      break;

    case 'AWAITING_COLLECTION':
      await handleAwaitingCollectionOrder(apiRoot, orders);
      break;

    case 'IN_TRANSIT':
      await handleInTransitOrder(apiRoot, orders);
      break;

    case 'DELIVERED':
      await handleDeliveredOrder(apiRoot, orders);
      break;

    case 'COMPLETED':
      await handleCompletedOrder(apiRoot, orders);
      break;

    case 'CANCEL':
      await handleCancelledOrder(apiRoot, orders);
      break;

    default:
      logger.info(`Unknown order status ${webhookBody.data.order_status}`);
      break;
  }
};

export const reverseStatusUpdate = async (
  webhookBody: TiktokWebhookOrderStatusChangeMessageType
) => {
  logger.info('Reverse status update', JSON.stringify(webhookBody, null, 2));
};

const handleUnpaidOrder = async (
  apiRoot: ByProjectKeyRequestBuilder,
  orders: Types.TiktokSDK.Order202507GetOrderDetailResponseDataOrders[],
  accessToken: string,
  config: Types.ShopConfigurationData,
  commercetoolsLocale: string
) => {
  const externalOrderReferences: Types.TiktokSDK.Order202406AddExternalOrderReferencesRequestBodyOrders[] =
    [];
  for await (const order of orders) {
    const orderDraft =
      await Mappers.Order.tiktokOrderToCommercetoolsOrderImportDraft(order, {
        locale: commercetoolsLocale,
        shopRegion: config?.shop_region,
      });
    const commercetoolsOrder = await OrderController.createOrder(
      apiRoot,
      orderDraft
    );
    externalOrderReferences.push(
      Mappers.Order.mapCommercetoolsOrderToTiktokOrderReference(
        order,
        commercetoolsOrder
      )
    );
  }
  await RouterService.addExternalOrderReference(
    accessToken,
    config.shopCipher!,
    {
      orders: externalOrderReferences,
    }
  );
  logger.info(
    `Added ${externalOrderReferences.length} external order references`
  );
};

const handleOnHoldOrder = async (
  apiRoot: ByProjectKeyRequestBuilder,
  orders: Types.TiktokSDK.Order202507GetOrderDetailResponseDataOrders[],
  accessToken: string,
  config: Types.ShopConfigurationData,
  commercetoolsLocale: string
) => {
  for await (const order of orders) {
    logger.info(`ON_HOLD order ${order} received`);
    const commercetoolsPaymentDraft =
      await Mappers.Payment.tiktokOrderToCommercetoolsPaymentDraft(order, {
        locale: commercetoolsLocale,
        shopRegion: config?.shop_region,
      });
    const commercetoolsPayment = await OrderController.createPayment(
      apiRoot,
      commercetoolsPaymentDraft
    );
    const updatedOrder = await Services.updateCommercetoolsOrderFromTiktokOrder(
      apiRoot,
      order,
      [
        {
          action: 'addPayment',
          payment: {
            typeId: 'payment',
            id: commercetoolsPayment.id,
          },
        },
        {
          action: 'changePaymentState',
          paymentState: 'Paid',
        },
      ]
    );
    logger.info(
      `Updated order ${updatedOrder.id} with payment ${commercetoolsPayment.id}`
    );
  }
};

const handleAwaitingShipmentOrder = async (
  apiRoot: ByProjectKeyRequestBuilder,
  orders: Types.TiktokSDK.Order202507GetOrderDetailResponseDataOrders[]
) => {
  for await (const order of orders) {
    logger.info(`AWAITING_SHIPMENT order ${orders.length} received`);
    const updatedOrder = await Services.updateCommercetoolsOrderFromTiktokOrder(
      apiRoot,
      order,
      [
        {
          action: 'changeShipmentState',
          shipmentState: 'Pending',
        },
      ]
    );
    logger.info(`Updated order ${updatedOrder.id} with shipment state Pending`);
  }
};

const handleAwaitingCollectionOrder = async (
  apiRoot: ByProjectKeyRequestBuilder,
  orders: Types.TiktokSDK.Order202507GetOrderDetailResponseDataOrders[]
) => {
  for await (const order of orders) {
    logger.info(`AWAITING_COLLECTION order ${orders.length} received`);
    const updatedOrder = await Services.updateCommercetoolsOrderFromTiktokOrder(
      apiRoot,
      order,
      [
        {
          action: 'changeShipmentState',
          shipmentState: 'Pending',
        },
      ]
    );
    logger.info(`Updated order ${updatedOrder.id} with shipment state Pending`);
  }
};

const handleInTransitOrder = async (
  apiRoot: ByProjectKeyRequestBuilder,
  orders: Types.TiktokSDK.Order202507GetOrderDetailResponseDataOrders[]
) => {
  for await (const order of orders) {
    logger.info(`IN_TRANSIT order ${orders.length} received`);
    const updatedOrder = await Services.updateCommercetoolsOrderFromTiktokOrder(
      apiRoot,
      order,
      [
        {
          action: 'changeShipmentState',
          shipmentState: 'Shipped',
        },
      ]
    );
    logger.info(`Updated order ${updatedOrder.id} with shipment state Shipped`);
  }
};

const handleDeliveredOrder = async (
  apiRoot: ByProjectKeyRequestBuilder,
  orders: Types.TiktokSDK.Order202507GetOrderDetailResponseDataOrders[]
) => {
  for await (const order of orders) {
    logger.info(`DELIVERED order ${orders.length} received`);
    const updatedOrder = await Services.updateCommercetoolsOrderFromTiktokOrder(
      apiRoot,
      order,
      [
        {
          action: 'changeShipmentState',
          shipmentState: 'Delivered',
        },
      ]
    );
    logger.info(`Updated order ${updatedOrder.id} with order state Delivered`);
  }
};

const handleCompletedOrder = async (
  apiRoot: ByProjectKeyRequestBuilder,
  orders: Types.TiktokSDK.Order202507GetOrderDetailResponseDataOrders[]
) => {
  for await (const order of orders) {
    logger.info(`COMPLETED order ${orders.length} received`);
    const updatedOrder = await Services.updateCommercetoolsOrderFromTiktokOrder(
      apiRoot,
      order,
      [
        {
          action: 'changeOrderState',
          orderState: 'Completed',
        },
      ]
    );
    logger.info(`Updated order ${updatedOrder.id} with order state Completed`);
  }
};

const handleCancelledOrder = async (
  apiRoot: ByProjectKeyRequestBuilder,
  orders: Types.TiktokSDK.Order202507GetOrderDetailResponseDataOrders[]
) => {
  for await (const order of orders) {
    logger.info(`CANCELLED order ${orders.length} received`);
    const updatedOrder = await Services.updateCommercetoolsOrderFromTiktokOrder(
      apiRoot,
      order,
      [
        {
          action: 'changeOrderState',
          orderState: 'Cancelled',
        },
      ]
    );
    logger.info(`Updated order ${updatedOrder.id} with order state Cancelled`);
  }
};
