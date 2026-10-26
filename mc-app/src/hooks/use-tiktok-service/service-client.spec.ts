import {
  createServiceClient,
  ServiceError,
  type ServiceTransport,
} from './service-client';

const respond = (status: number, body: unknown) =>
  jest.fn<ReturnType<ServiceTransport>, Parameters<ServiceTransport>>(
    async () => ({ status, body })
  );

describe('createServiceClient', () => {
  it('reads the connection status from mc/connection-status', async () => {
    const status = { connected: true, warehouses: [] };
    const transport = respond(200, status);

    await expect(
      createServiceClient(transport).getConnectionStatus()
    ).resolves.toEqual(status);
    expect(transport).toHaveBeenCalledWith({
      method: 'GET',
      path: 'mc/connection-status',
    });
  });

  it('posts the product ids to mc/selective-product-sync', async () => {
    const transport = respond(202, { message: 'Started' });

    await createServiceClient(transport).selectiveProductSync(['a', 'b']);
    expect(transport).toHaveBeenCalledWith({
      method: 'POST',
      path: 'mc/selective-product-sync',
      body: { productIds: ['a', 'b'] },
    });
  });

  it('puts the mappings to mc/mappings', async () => {
    const mappings = { productTypes: {} };
    const transport = respond(200, mappings);

    await createServiceClient(transport).putMappings(mappings);
    expect(transport).toHaveBeenCalledWith({
      method: 'PUT',
      path: 'mc/mappings',
      body: mappings,
    });
  });

  it('encodes the category id in the TikTok metadata paths', async () => {
    const transport = respond(200, { attributes: [] });
    const client = createServiceClient(transport);

    await client.getCategoryAttributes('a/b');
    await client.getCategoryRules('a/b');
    expect(transport).toHaveBeenNthCalledWith(1, {
      method: 'GET',
      path: 'tiktok/categories/a%2Fb/attributes',
    });
    expect(transport).toHaveBeenNthCalledWith(2, {
      method: 'GET',
      path: 'tiktok/categories/a%2Fb/rules',
    });
  });

  it('throws a ServiceError carrying the service message and status', async () => {
    const client = createServiceClient(
      respond(403, { message: 'Wrong project' })
    );

    await expect(client.fullProductCheck()).rejects.toMatchObject({
      name: 'ServiceError',
      message: 'Wrong project',
      status: 403,
    });
  });

  it('falls back to a generic message when the body has none', async () => {
    const client = createServiceClient(respond(502, undefined));

    const error = await client
      .fullProductCheck()
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ServiceError);
    expect((error as ServiceError).message).toContain('502');
  });
});
