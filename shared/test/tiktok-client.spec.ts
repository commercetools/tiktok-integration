import { TikTokApiError } from '../errors';

const productsPost = jest.fn();
const shopsGet = jest.fn();
const categoriesGet = jest.fn();
const ordersSearchPost = jest.fn();

jest.mock('../tiktok-sdk', () => ({
  TikTokShopNodeApiClient: jest.fn().mockImplementation(() => ({
    api: {
      ProductV202309Api: { ProductsPost: productsPost, CategoriesGet: categoriesGet },
      AuthorizationV202309Api: { ShopsGet: shopsGet },
      OrderV202309Api: { OrdersSearchPost: ordersSearchPost },
    },
  })),
}));
jest.mock('../tiktok-sdk/api/apis', () => ({}));
jest.mock('../state', () => ({ getValidAccessToken: jest.fn(), readState: jest.fn() }));
jest.mock('../config', () => ({ readConfiguration: jest.fn() }));

import { createTikTokClient } from '../tiktok/client';

const client = createTikTokClient({
  appKey: 'k',
  appSecret: 's',
  getAccessToken: async () => 'token',
  getShopCipher: async () => 'cipher',
});

describe('TikTok client', () => {
  it('passes the current token and shop cipher and unwraps data', async () => {
    productsPost.mockResolvedValue({ body: { code: 0, data: { productId: 'p1' } } });
    expect(await client.products.create({})).toEqual({ productId: 'p1' });
    expect(productsPost).toHaveBeenCalledWith('token', 'application/json', 'cipher', {});
  });

  it('throws TikTokApiError with code and request id on a non-zero code', async () => {
    productsPost.mockResolvedValue({ body: { code: 12052001, message: 'bad', requestId: 'r1' } });
    await expect(client.products.create({})).rejects.toMatchObject({
      name: TikTokApiError.name,
      code: 12052001,
      requestId: 'r1',
    });
  });

  it('lists categories with the v2 tree by default', async () => {
    categoriesGet.mockResolvedValue({ body: { code: 0, data: { categories: [{ id: '1' }] } } });
    expect(await client.categories.list({ locale: 'en-US' })).toEqual([{ id: '1' }]);
    expect(categoriesGet).toHaveBeenCalledWith(
      'token', 'application/json', 'en-US', undefined, 'v2', undefined, undefined, undefined, 'cipher',
    );
  });

  it('looks up authorized shops with an explicit token and no cipher', async () => {
    shopsGet.mockResolvedValue({ body: { code: 0, data: { shops: [{ id: 's1' }] } } });
    expect(await client.shops.getAuthorized('fresh')).toEqual([{ id: 's1' }]);
    expect(shopsGet).toHaveBeenCalledWith('fresh', 'application/json');
  });

  it('searches orders oldest update first and returns the page with its token', async () => {
    ordersSearchPost.mockResolvedValue({
      body: { code: 0, data: { orders: [{ id: 'o1' }], nextPageToken: 'next' } },
    });
    const filter = { updateTimeGe: 100 };
    expect(await client.orders.search(filter, { pageSize: 20, pageToken: 'tok' })).toEqual({
      orders: [{ id: 'o1' }],
      nextPageToken: 'next',
    });
    expect(ordersSearchPost).toHaveBeenCalledWith(
      20, 'token', 'application/json', 'ASC', 'tok', 'update_time', 'cipher', filter,
    );
  });
});
