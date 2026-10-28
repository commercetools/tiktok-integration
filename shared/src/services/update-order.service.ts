import type {
  ByProjectKeyRequestBuilder,
  Order,
  OrderUpdateAction,
} from '@commercetools/platform-sdk';

const MAX_CONFLICT_RETRIES = 3;

const escapePredicateString = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const isConflict = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { statusCode?: number }).statusCode === 409;

export const findCommercetoolsOrderByTiktokOrderId = async (
  apiRoot: ByProjectKeyRequestBuilder,
  tiktokOrderId: string,
): Promise<Order | undefined> => {
  const { body } = await apiRoot
    .orders()
    .get({
      queryArgs: {
        where: `custom(fields(tiktokOrderId="${escapePredicateString(tiktokOrderId)}"))`,
        limit: 1,
      },
    })
    .execute();
  return body.results[0];
};

/**
 * Applies update actions to the commercetools order that mirrors a TikTok order.
 * Re-reads the order and retries when another writer bumped its version.
 */
export const updateCommercetoolsOrderFromTiktokOrder = async (
  apiRoot: ByProjectKeyRequestBuilder,
  tiktokOrderId: string,
  updateActions: OrderUpdateAction[],
): Promise<Order> => {
  for (let attempt = 0; ; attempt++) {
    const order = await findCommercetoolsOrderByTiktokOrderId(
      apiRoot,
      tiktokOrderId,
    );
    if (!order) {
      throw new Error(`Order ${tiktokOrderId} not found`);
    }
    try {
      const { body } = await apiRoot
        .orders()
        .withId({ ID: order.id })
        .post({ body: { version: order.version, actions: updateActions } })
        .execute();
      return body;
    } catch (error) {
      if (!isConflict(error) || attempt >= MAX_CONFLICT_RETRIES) throw error;
    }
  }
};
