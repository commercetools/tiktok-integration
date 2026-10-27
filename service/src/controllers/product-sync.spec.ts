jest.mock('tiktok-shared/dist/src/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('tiktok-shared/dist/src/commercetools/client');
jest.mock('tiktok-shared/dist/src/state');
jest.mock('tiktok-shared/dist/src/commercetools/controllers/product.controller');
jest.mock('tiktok-shared/dist/src/tiktok/client');
jest.mock('tiktok-shared/dist/src/mappers/product/product.mapper');

import { createApiRoot } from 'tiktok-shared/dist/src/commercetools/client';
import { logger } from 'tiktok-shared/dist/src/logger';
import {
  buildTiktokProductDraft,
  loadProductMappingContext,
} from 'tiktok-shared/dist/src/mappers/product/product.mapper';
import { getAllProducts } from 'tiktok-shared/dist/src/commercetools/controllers/product.controller';
import { getTikTokStore, getValidAccessToken } from 'tiktok-shared/dist/src/state';
import { getTikTokClient } from 'tiktok-shared/dist/src/tiktok/client';
import { HttpError } from '../errors/http-error';
import {
  runFullProductCheck,
  startFullProductSync,
  startSelectiveProductSync,
} from './product-sync';

const product = (id: string, imageUrls: string[] = []) => ({
  id,
  masterVariant: { images: imageUrls.map((url) => ({ url })) },
  variants: [{ images: imageUrls.slice(0, 1).map((url) => ({ url })) }],
});

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

describe('product sync', () => {
  const query = jest.fn();
  const client = {
    products: { search: jest.fn(), create: jest.fn() },
    images: { upload: jest.fn() },
  };
  let catalog: ReturnType<typeof product>[];

  beforeEach(() => {
    catalog = [product('p1', ['https://img/a.jpg', 'https://img/b.jpg']), product('p2')];
    query.mockReset().mockImplementation(() =>
      Promise.resolve({ body: { results: catalog.filter((item) => item.id === 'p1') } }),
    );
    jest.mocked(getAllProducts).mockImplementation(async () => ({ results: catalog }) as never);
    jest.mocked(createApiRoot).mockReturnValue({
      productProjections: () => ({ get: (args: unknown) => ({ execute: () => query(args) }) }),
    } as never);
    jest.mocked(getTikTokStore).mockResolvedValue({ key: 'tiktok-store' } as never);
    jest.mocked(getValidAccessToken).mockResolvedValue('token');
    jest.mocked(getTikTokClient).mockResolvedValue(client as never);
    jest.mocked(loadProductMappingContext).mockResolvedValue({ shop: {}, mappings: {} } as never);
    jest.mocked(buildTiktokProductDraft).mockImplementation(
      (item) => ({ title: item.id, skus: [{ sellerSku: `sku-${item.id}` }] }) as never,
    );
    client.products.search.mockReset().mockResolvedValue({ products: [] });
    client.products.create.mockReset().mockResolvedValue({ productId: 'tt-1' });
    client.images.upload.mockReset().mockImplementation(async (url: string) => ({ uri: `uri:${url}` }));
  });

  it('answers at once, then uploads images and creates each product in the store projection', async () => {
    const result = await startFullProductSync();
    await flush();

    expect(result.message).toBe('Full sync started for 2 products');
    expect(getAllProducts).toHaveBeenCalledWith(expect.anything(), 'tiktok-store');
    expect(client.images.upload.mock.calls.map(([url]) => url)).toEqual([
      'https://img/a.jpg',
      'https://img/b.jpg',
    ]);
    expect(client.products.create).toHaveBeenCalledTimes(2);
    expect(client.products.create.mock.calls[0][0]).toMatchObject({
      title: 'p1',
      mainImages: [{ uri: 'uri:https://img/a.jpg' }, { uri: 'uri:https://img/b.jpg' }],
    });
    expect(logger.info).toHaveBeenCalledWith('Full sync: finished', { created: 2, skipped: 0, failed: 0 });
  });

  it('skips products TikTok already lists by seller SKU', async () => {
    client.products.search.mockImplementation(async ({ sellerSkus }: { sellerSkus: string[] }) => ({
      products: sellerSkus.includes('sku-p1') ? [{ id: 'existing' }] : [],
    }));

    await startFullProductSync();
    await flush();

    expect(client.products.create).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith('Full sync: finished', { created: 1, skipped: 1, failed: 0 });
  });

  it('keeps going when one product fails', async () => {
    client.products.create.mockRejectedValueOnce(new Error('rejected')).mockResolvedValue({});

    await startFullProductSync();
    await flush();

    expect(logger.info).toHaveBeenCalledWith('Full sync: finished', { created: 1, skipped: 0, failed: 1 });
    expect(logger.error).toHaveBeenCalledWith(
      'Full sync: syncing product failed',
      expect.objectContaining({ productId: 'p1', error: 'rejected' }),
    );
  });

  it('selects products by id with a predicate variable', async () => {
    const result = await startSelectiveProductSync(['p1']);

    expect(result.message).toBe('Selective sync started for 1 products');
    expect(query.mock.calls[0][0].queryArgs).toMatchObject({
      storeProjection: 'tiktok-store',
      where: 'id in :ids',
      'var.ids': ['p1'],
    });
  });

  it.each([[undefined], [[]], [['']], [[1]], ['p1']])('rejects product ids %j', async (ids) => {
    await expect(startSelectiveProductSync(ids)).rejects.toBeInstanceOf(HttpError);
  });

  it('reports a configuration problem as a 400 before answering', async () => {
    jest.mocked(loadProductMappingContext).mockRejectedValue(new Error('No warehouse channel found'));

    await expect(startFullProductSync()).rejects.toMatchObject({
      statusCode: 400,
      message: 'No warehouse channel found',
    });
    expect(client.products.create).not.toHaveBeenCalled();
  });

  it('refuses to start when the catalog is empty', async () => {
    catalog = [];

    await expect(startFullProductSync()).rejects.toMatchObject({ statusCode: 400 });
  });

  it('checks every product without calling TikTok', async () => {
    jest.mocked(buildTiktokProductDraft).mockImplementation((item) => {
      if (item.id === 'p2') throw new Error('Category ID is required');
      return {} as never;
    });

    const result = await runFullProductCheck();

    expect(result).toEqual({
      importableProducts: ['p1'],
      unimportableProducts: [{ id: 'p2', error: 'Category ID is required' }],
    });
    expect(getTikTokClient).not.toHaveBeenCalled();
  });
});
