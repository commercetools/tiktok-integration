import { TikTokShopNodeApiClient } from '../tiktok-sdk';
import type {
  Event202309UpdateShopWebhookRequestBody,
  Order202309GetOrderListRequestBody,
  Order202406AddExternalOrderReferencesRequestBody,
  Product202309ActivateProductsRequestBody,
  Product202309CreateProductRequestBody,
  Product202309DeactivateProductsRequestBody,
  Product202309DeleteProductsRequestBody,
  Product202309UpdateInventoryRequestBody,
  Product202502SearchProductsRequestBody,
  Product202509EditProductRequestBody,
  Product202509PartialEditProductRequestBody,
} from '../tiktok-sdk';
import { RequestFile } from '../tiktok-sdk/api/apis';
import { readConfiguration } from '../config';
import { NotAuthorizedError, TikTokApiError } from '../errors';
import { getValidAccessToken, readState } from '../state';

const JSON_CONTENT = 'application/json';
const MULTIPART_CONTENT = 'multipart/form-data';

/** Category tree version: US, EU and SEA shops must pass v2 (the 7-level tree). */
const DEFAULT_CATEGORY_VERSION = 'v2';

interface TikTokEnvelope<T> {
  code?: number;
  message?: string;
  requestId?: string;
  data?: T;
}

const assertSuccess = (body: TikTokEnvelope<unknown>): void => {
  if (body.code !== 0) {
    throw new TikTokApiError(
      `TikTok API error: ${body.message ?? 'unknown error'}`,
      body.code,
      body.requestId,
    );
  }
};

/** Throws on a non-zero `code`; returns `data`, which must be present. */
const unwrap = <T>(body: TikTokEnvelope<T>): T => {
  assertSuccess(body);
  if (body.data === undefined) {
    throw new TikTokApiError(
      'TikTok API returned no data',
      body.code,
      body.requestId,
    );
  }
  return body.data;
};

/** Throws on a non-zero `code`; `data` may legitimately be absent (mutations). */
const unwrapOptional = <T>(body: TikTokEnvelope<T>): T | undefined => {
  assertSuccess(body);
  return body.data;
};

const fileNameOf = (imageUrl: string): string =>
  new URL(imageUrl).pathname.split('/').pop() || 'image.jpg';

export interface TikTokClientOptions {
  appKey: string;
  appSecret: string;
  /** Called before every request so long-running syncs always send a valid token. */
  getAccessToken: () => Promise<string>;
  /** Required by every shop-scoped call; not by `shops.getAuthorized`. */
  getShopCipher: () => Promise<string>;
}

/**
 * Thin wrapper over the vendored SDK: binds token and shop cipher, unwraps the TikTok
 * response envelope and throws `TikTokApiError` on a non-zero `code`.
 * SDK API versions are documented in `shared/tiktok/README.md`.
 */
export const createTikTokClient = (options: TikTokClientOptions) => {
  const sdk = new TikTokShopNodeApiClient({
    config: { app_key: options.appKey, app_secret: options.appSecret },
  }).api;

  const scope = async () => ({
    token: await options.getAccessToken(),
    cipher: await options.getShopCipher(),
  });

  return {
    products: {
      create: async (body: Product202309CreateProductRequestBody) => {
        const { token, cipher } = await scope();
        const res = await sdk.ProductV202309Api.ProductsPost(token, JSON_CONTENT, cipher, body);
        return unwrap(res.body);
      },
      update: async (productId: string, body: Product202509EditProductRequestBody) => {
        const { token, cipher } = await scope();
        const res = await sdk.ProductV202509Api.ProductsProductIdPut(productId, token, JSON_CONTENT, cipher, body);
        return unwrapOptional(res.body);
      },
      partialUpdate: async (productId: string, body: Product202509PartialEditProductRequestBody) => {
        const { token, cipher } = await scope();
        const res = await sdk.ProductV202509Api.ProductsProductIdPartialEditPost(productId, token, JSON_CONTENT, cipher, body);
        return unwrapOptional(res.body);
      },
      activate: async (productIds: string[], listingPlatforms?: string[]) => {
        const body: Product202309ActivateProductsRequestBody = { productIds, listingPlatforms };
        const { token, cipher } = await scope();
        const res = await sdk.ProductV202309Api.ProductsActivatePost(token, JSON_CONTENT, cipher, body);
        return unwrapOptional(res.body);
      },
      deactivate: async (productIds: string[]) => {
        const body: Product202309DeactivateProductsRequestBody = { productIds };
        const { token, cipher } = await scope();
        const res = await sdk.ProductV202309Api.ProductsDeactivatePost(token, JSON_CONTENT, cipher, body);
        return unwrapOptional(res.body);
      },
      delete: async (productIds: string[]) => {
        const body: Product202309DeleteProductsRequestBody = { productIds };
        const { token, cipher } = await scope();
        const res = await sdk.ProductV202309Api.ProductsDelete(token, JSON_CONTENT, cipher, body);
        return unwrapOptional(res.body);
      },
      get: async (productId: string, opts?: { locale?: string; draft?: boolean }) => {
        const { token, cipher } = await scope();
        const res = await sdk.ProductV202309Api.ProductsProductIdGet(
          productId, token, JSON_CONTENT, false, opts?.draft ?? false, opts?.locale, cipher,
        );
        return unwrap(res.body);
      },
      search: async (
        body?: Product202502SearchProductsRequestBody,
        page?: { pageSize?: number; pageToken?: string },
      ) => {
        const { token, cipher } = await scope();
        const res = await sdk.ProductV202502Api.ProductsSearchPost(
          page?.pageSize ?? 10, token, JSON_CONTENT, page?.pageToken, cipher, body,
        );
        return unwrap(res.body);
      },
    },

    images: {
      /** Downloads `imageUrl` and uploads it to TikTok; the returned `uri` goes into product payloads. */
      upload: async (imageUrl: string, useCase = 'MAIN_IMAGE') => {
        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new TikTokApiError(`Failed to download image (${response.status})`);
        }
        const file: RequestFile = {
          value: Buffer.from(await response.arrayBuffer()),
          options: {
            filename: fileNameOf(imageUrl),
            contentType: response.headers.get('content-type') ?? 'image/jpeg',
          },
        };
        const token = await options.getAccessToken();
        const res = await sdk.ProductV202309Api.ImagesUploadPost(token, MULTIPART_CONTENT, file, useCase);
        return unwrap(res.body);
      },
    },

    inventory: {
      update: async (productId: string, body: Product202309UpdateInventoryRequestBody) => {
        const { token, cipher } = await scope();
        const res = await sdk.ProductV202309Api.ProductsProductIdInventoryUpdatePost(productId, token, JSON_CONTENT, cipher, body);
        return unwrapOptional(res.body);
      },
    },

    orders: {
      get: async (ids: string[]) => {
        const { token, cipher } = await scope();
        const res = await sdk.OrderV202507Api.OrdersGet(ids, token, JSON_CONTENT, cipher);
        return unwrap(res.body).orders ?? [];
      },
      /**
       * Orders matching `filter`, oldest update first so a time-boxed caller always makes
       * progress; follow `nextPageToken` for the next page. Only the 202309 API has search.
       */
      search: async (
        filter?: Order202309GetOrderListRequestBody,
        page?: { pageSize?: number; pageToken?: string },
      ) => {
        const { token, cipher } = await scope();
        const res = await sdk.OrderV202309Api.OrdersSearchPost(
          page?.pageSize ?? 50, token, JSON_CONTENT, 'ASC', page?.pageToken, 'update_time', cipher, filter,
        );
        return unwrap(res.body);
      },
      addExternalReferences: async (body: Order202406AddExternalOrderReferencesRequestBody) => {
        const { token, cipher } = await scope();
        const res = await sdk.OrderV202406Api.OrdersExternalOrdersPost(token, JSON_CONTENT, cipher, body);
        return unwrapOptional(res.body);
      },
    },

    categories: {
      list: async (opts?: { locale?: string; keyword?: string; categoryVersion?: string; listingPlatform?: string; includeProhibitedCategories?: boolean }) => {
        const { token, cipher } = await scope();
        const res = await sdk.ProductV202309Api.CategoriesGet(
          token, JSON_CONTENT, opts?.locale, opts?.keyword,
          opts?.categoryVersion ?? DEFAULT_CATEGORY_VERSION, opts?.listingPlatform,
          opts?.includeProhibitedCategories, undefined, cipher,
        );
        return unwrap(res.body).categories ?? [];
      },
      rules: async (categoryId: string, opts?: { locale?: string; categoryVersion?: string }) => {
        const { token, cipher } = await scope();
        const res = await sdk.ProductV202309Api.CategoriesCategoryIdRulesGet(
          categoryId, token, JSON_CONTENT, opts?.categoryVersion ?? DEFAULT_CATEGORY_VERSION, opts?.locale, cipher,
        );
        return unwrap(res.body);
      },
      attributes: async (categoryId: string, opts?: { locale?: string; categoryVersion?: string }) => {
        const { token, cipher } = await scope();
        const res = await sdk.ProductV202309Api.CategoriesCategoryIdAttributesGet(
          categoryId, token, JSON_CONTENT, opts?.locale, opts?.categoryVersion ?? DEFAULT_CATEGORY_VERSION, undefined, cipher,
        );
        return unwrap(res.body);
      },
    },

    warehouses: {
      list: async () => {
        const { token, cipher } = await scope();
        const res = await sdk.LogisticsV202309Api.WarehousesGet(token, JSON_CONTENT, cipher);
        return unwrap(res.body).warehouses ?? [];
      },
    },

    shops: {
      /** Shops the token is authorized for (id, name, region, cipher, code). Needs no shop cipher. */
      getAuthorized: async (accessToken?: string) => {
        const token = accessToken ?? (await options.getAccessToken());
        const res = await sdk.AuthorizationV202309Api.ShopsGet(token, JSON_CONTENT);
        return unwrap(res.body).shops ?? [];
      },
    },

    events: {
      getWebhooks: async () => {
        const { token, cipher } = await scope();
        const res = await sdk.EventV202309Api.WebhooksGet(token, JSON_CONTENT, cipher);
        return unwrap(res.body).webhooks ?? [];
      },
      updateWebhook: async (body: Event202309UpdateShopWebhookRequestBody) => {
        const { token, cipher } = await scope();
        const res = await sdk.EventV202309Api.WebhooksPut(token, JSON_CONTENT, cipher, body);
        unwrapOptional(res.body);
      },
    },
  };
};

export type TikTokClient = ReturnType<typeof createTikTokClient>;

/**
 * The TikTok client for this deployment's shop: app credentials from configuration, a valid
 * (lazily refreshed) access token and the shop cipher from the Store state.
 */
export const getTikTokClient = async (): Promise<TikTokClient> => {
  const { appKey, appSecret } = readConfiguration().tiktok;
  return createTikTokClient({
    appKey,
    appSecret,
    getAccessToken: getValidAccessToken,
    getShopCipher: async () => {
      const cipher = (await readState())?.tiktokShopCipher;
      if (!cipher) {
        throw new NotAuthorizedError(
          'The TikTok shop cipher is unknown. Authorize the app from the Merchant Center.',
        );
      }
      return cipher;
    },
  });
};
