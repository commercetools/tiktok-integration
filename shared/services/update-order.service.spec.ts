import type { ByProjectKeyRequestBuilder } from '@commercetools/platform-sdk';
import { updateCommercetoolsOrderFromTiktokOrder } from './update-order.service';

const buildApiRoot = (
  post: jest.Mock,
  orders: unknown[] = [{ id: 'o1', version: 3 }],
) => {
  const get = jest.fn(() => ({
    execute: async () => ({ body: { results: orders } }),
  }));
  const withId = jest.fn(() => ({
    post: (args: unknown) => ({ execute: () => post(args) }),
  }));
  const apiRoot = {
    orders: () => ({ get, withId }),
  } as unknown as ByProjectKeyRequestBuilder;
  return { apiRoot, get, withId };
};

describe('updateCommercetoolsOrderFromTiktokOrder', () => {
  const actions = [
    { action: 'changeShipmentState', shipmentState: 'Shipped' },
  ] as const;

  it('finds the order by TikTok order id and applies the actions', async () => {
    const post = jest
      .fn()
      .mockResolvedValue({ body: { id: 'o1', version: 4 } });
    const { apiRoot, get, withId } = buildApiRoot(post);
    const result = await updateCommercetoolsOrderFromTiktokOrder(
      apiRoot,
      '123',
      [...actions],
    );
    expect(result).toEqual({ id: 'o1', version: 4 });
    expect(get).toHaveBeenCalledWith({
      queryArgs: { where: 'custom(fields(tiktokOrderId="123"))', limit: 1 },
    });
    expect(withId).toHaveBeenCalledWith({ ID: 'o1' });
    expect(post).toHaveBeenCalledWith({ body: { version: 3, actions } });
  });

  it('escapes the id inside the query predicate', async () => {
    const post = jest.fn().mockResolvedValue({ body: {} });
    const { apiRoot, get } = buildApiRoot(post);
    await updateCommercetoolsOrderFromTiktokOrder(apiRoot, '1" or "1"="1', []);
    expect(get).toHaveBeenCalledWith({
      queryArgs: {
        where: 'custom(fields(tiktokOrderId="1\\" or \\"1\\"=\\"1"))',
        limit: 1,
      },
    });
  });

  it('retries on a version conflict', async () => {
    const post = jest
      .fn()
      .mockRejectedValueOnce({ statusCode: 409 })
      .mockResolvedValueOnce({ body: { id: 'o1', version: 5 } });
    const { apiRoot, get } = buildApiRoot(post);
    await expect(
      updateCommercetoolsOrderFromTiktokOrder(apiRoot, '123', [...actions]),
    ).resolves.toEqual({ id: 'o1', version: 5 });
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('gives up after repeated conflicts and rethrows other errors', async () => {
    const conflict = { statusCode: 409 };
    const post = jest.fn().mockRejectedValue(conflict);
    const { apiRoot } = buildApiRoot(post);
    await expect(
      updateCommercetoolsOrderFromTiktokOrder(apiRoot, '123', [...actions]),
    ).rejects.toBe(conflict);
    expect(post).toHaveBeenCalledTimes(4);

    const failing = jest.fn().mockRejectedValue(new Error('500'));
    await expect(
      updateCommercetoolsOrderFromTiktokOrder(
        buildApiRoot(failing).apiRoot,
        '1',
        [],
      ),
    ).rejects.toThrow('500');
    expect(failing).toHaveBeenCalledTimes(1);
  });

  it('throws when the order does not exist', async () => {
    const { apiRoot } = buildApiRoot(jest.fn(), []);
    await expect(
      updateCommercetoolsOrderFromTiktokOrder(apiRoot, '999', []),
    ).rejects.toThrow('Order 999 not found');
  });
});
