import type {
  ActionResult,
  AuthorizationLink,
  ConnectionStatus,
  MappingConfig,
  ProductCheckResult,
  TikTokAttribute,
  TikTokCategory,
  TikTokCategoryRules,
} from './types';

export type ServiceResponse = {
  status: number;
  body: unknown;
};

/** Sends one request to the service, and returns its status and parsed body. */
export type ServiceTransport = (request: {
  method: 'GET' | 'POST' | 'PUT';
  path: string;
  body?: unknown;
}) => Promise<ServiceResponse>;

export class ServiceError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ServiceError';
    this.status = status;
  }
}

const messageOf = (body: unknown, status: number) => {
  if (body && typeof body === 'object' && 'message' in body) {
    const { message } = body as { message: unknown };
    if (typeof message === 'string' && message) return message;
  }
  return `The TikTok service answered with HTTP ${status}.`;
};

export const createServiceClient = (transport: ServiceTransport) => {
  const call = async <T>(
    method: 'GET' | 'POST' | 'PUT',
    path: string,
    body?: unknown
  ): Promise<T> => {
    const response = await transport({
      method,
      path,
      ...(body === undefined ? {} : { body }),
    });
    if (response.status < 200 || response.status >= 300) {
      throw new ServiceError(
        messageOf(response.body, response.status),
        response.status
      );
    }
    return response.body as T;
  };

  const category = (categoryId: string) =>
    `tiktok/categories/${encodeURIComponent(categoryId)}`;

  return {
    getAuthorizationLink: () =>
      call<AuthorizationLink>('GET', 'mc/authorization-link'),
    getConnectionStatus: () =>
      call<ConnectionStatus>('GET', 'mc/connection-status'),
    fullProductSync: () => call<ActionResult>('POST', 'mc/full-product-sync'),
    selectiveProductSync: (productIds: string[]) =>
      call<ActionResult>('POST', 'mc/selective-product-sync', { productIds }),
    fullProductCheck: () =>
      call<ProductCheckResult>('GET', 'mc/full-product-check'),
    shopConfigSync: () => call<ActionResult>('POST', 'mc/shop-config-sync'),
    getMappings: () => call<MappingConfig>('GET', 'mc/mappings'),
    putMappings: (mappings: MappingConfig) =>
      call<MappingConfig>('PUT', 'mc/mappings', mappings),
    getCategories: () =>
      call<{ categories: TikTokCategory[] }>('GET', 'tiktok/categories'),
    getCategoryRules: (categoryId: string) =>
      call<{ rules: TikTokCategoryRules }>(
        'GET',
        `${category(categoryId)}/rules`
      ),
    getCategoryAttributes: (categoryId: string) =>
      call<{ attributes: TikTokAttribute[] }>(
        'GET',
        `${category(categoryId)}/attributes`
      ),
  };
};

export type ServiceClient = ReturnType<typeof createServiceClient>;
