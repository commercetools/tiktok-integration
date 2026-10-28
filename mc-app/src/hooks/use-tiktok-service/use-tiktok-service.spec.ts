import {
  createForwardToTransport,
  normalizeServiceUrl,
} from './use-tiktok-service';

const mockExecute = jest.fn();

jest.mock('@commercetools-frontend/application-shell', () => ({
  buildApiUrl: (path: string) => `https://mc-api.test${path}`,
  executeHttpClientRequest: (...args: unknown[]) => mockExecute(...args),
}));

describe('normalizeServiceUrl', () => {
  it('trims whitespace and trailing slashes', () => {
    expect(normalizeServiceUrl('  https://svc.test/service// ')).toBe(
      'https://svc.test/service'
    );
  });

  it('treats a missing value as empty', () => {
    expect(normalizeServiceUrl(undefined)).toBe('');
  });
});

describe('createForwardToTransport', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    mockExecute.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    mockExecute.mockImplementation(async (fetcher) => {
      const response = await fetcher({
        credentials: 'include',
        headers: { 'x-project-key': 'p' },
      });
      return response.data;
    });
  });

  it('forwards the full-path audience policy without user permissions', async () => {
    fetchMock.mockResolvedValue(new Response('{"ok":true}', { status: 200 }));

    await createForwardToTransport('https://svc.test/service')({
      method: 'GET',
      path: 'mc/connection-status',
    });

    expect(mockExecute.mock.calls[0][1].forwardToConfig).toEqual({
      uri: 'https://svc.test/service/mc/connection-status',
      audiencePolicy: 'forward-url-full-path',
      includeUserPermissions: false,
    });
  });

  it('sends the method and JSON body through /proxy/forward-to and returns the parsed answer', async () => {
    fetchMock.mockResolvedValue(
      new Response('{"message":"Started"}', { status: 202 })
    );

    const response = await createForwardToTransport('https://svc.test/service')(
      {
        method: 'POST',
        path: 'mc/selective-product-sync',
        body: { productIds: ['a'] },
      }
    );

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://mc-api.test/proxy/forward-to');
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"productIds":["a"]}');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(response).toEqual({ status: 202, body: { message: 'Started' } });
  });

  it('keeps a non-JSON error body as a message', async () => {
    fetchMock.mockResolvedValue(new Response('Bad gateway', { status: 502 }));

    const response = await createForwardToTransport('https://svc.test/service')(
      {
        method: 'GET',
        path: 'mc/mappings',
      }
    );

    expect(response).toEqual({ status: 502, body: { message: 'Bad gateway' } });
  });
});
