import {
  Order,
  OrderImportDraft,
  OrderUpdateAction,
  Payment,
  PaymentDraft,
} from '@commercetools/platform-sdk';
import { ByProjectKeyRequestBuilder } from '@commercetools/platform-sdk/dist/declarations/src/generated/client/by-project-key-request-builder';

export const createOrder = async (
  apiRoot: ByProjectKeyRequestBuilder,
  orderDraft: OrderImportDraft,
): Promise<Order> => {
  const { body } = await apiRoot
    .orders()
    .importOrder()
    .post({
      body: orderDraft,
    })
    .execute();
  return body;
};

export const createPayment = async (
  apiRoot: ByProjectKeyRequestBuilder,
  paymentDraft: PaymentDraft,
): Promise<Payment> => {
  const { body } = await apiRoot
    .payments()
    .post({
      body: paymentDraft,
    })
    .execute();
  return body;
};

export const queryOrder = async (
  apiRoot: ByProjectKeyRequestBuilder,
  where: string,
): Promise<Order | undefined> => {
  const { body } = await apiRoot
    .orders()
    .get({
      queryArgs: {
        where: where,
      },
    })
    .execute();
  return body.results?.[0];
};

export const updateOrder = async (
  apiRoot: ByProjectKeyRequestBuilder,
  orderId: string,
  version: number,
  actions: OrderUpdateAction[],
): Promise<Order> => {
  const { body } = await apiRoot
    .orders()
    .withId({ ID: orderId })
    .post({
      body: {
        version: version,
        actions: actions,
      },
    })
    .execute();
  return body;
};
