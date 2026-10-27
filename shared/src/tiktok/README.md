# shared/tiktok

Typed wrappers over the vendored TikTok Shop SDK (`../tiktok-sdk`). Nothing here talks HTTP
except through that SDK (plus `fetch` to download product images).

| File | Purpose |
|---|---|
| `client.ts` | `createTikTokClient(options)` and `getTikTokClient()`; binds token and shop cipher, unwraps the response envelope, throws `TikTokApiError` on a non-zero `code`. |
| `auth.ts` | `exchangeAuthCode(code)`, `refreshAccessToken(refreshToken)` via the SDK's `AccessTokenTool` (`auth.tiktok-shops.com`). |
| `webhook-signature.ts` | `verifyWebhookSignature(...)`: HMAC-SHA256 of `app_key + rawBody`, constant-time compare. |
| `webhooks.ts` | `ensureWebhooks(client, address)`: idempotent Event API registration of the topics the connector handles. |

## SDK API versions in use

The SDK ships one API class per endpoint version. Each wrapper uses the newest version that
exposes the endpoint (checked against the vendored 2026-10-20 archive); when a newer class
exists but is for a different endpoint family, it does not apply.

| Wrapper | SDK class and method | Why this version |
|---|---|---|
| `products.create` | `ProductV202309Api.ProductsPost` | Only version of Create Product. |
| `products.update` | `ProductV202509Api.ProductsProductIdPut` | Newest Edit Product. |
| `products.partialUpdate` | `ProductV202509Api.ProductsProductIdPartialEditPost` | Newest Partial Edit Product. |
| `products.activate` / `deactivate` / `delete` | `ProductV202309Api.ProductsActivatePost` / `ProductsDeactivatePost` / `ProductsDelete` | Only versions. |
| `products.get` | `ProductV202309Api.ProductsProductIdGet` | Only version. |
| `products.search` | `ProductV202502Api.ProductsSearchPost` | Newest Search Products (202312 is superseded by 202502). |
| `images.upload` | `ProductV202309Api.ImagesUploadPost` | Only version. |
| `inventory.update` | `ProductV202309Api.ProductsProductIdInventoryUpdatePost` | Only version. |
| `orders.get` | `OrderV202507Api.OrdersGet` | Newest Get Order Detail (202309 is superseded). |
| `orders.search` | `OrderV202309Api.OrdersSearchPost` | Only version with search; sorted by `update_time` ascending. |
| `orders.addExternalReferences` | `OrderV202406Api.OrdersExternalOrdersPost` | Only version. |
| `categories.list` / `rules` / `attributes` | `ProductV202309Api.CategoriesGet` / `CategoriesCategoryIdRulesGet` / `CategoriesCategoryIdAttributesGet` | Only versions. |
| `warehouses.list` | `LogisticsV202309Api.WarehousesGet` | Only version. |
| `shops.getAuthorized` | `AuthorizationV202309Api.ShopsGet` | Only version. |
| `events.getWebhooks` / `updateWebhook` | `EventV202309Api.WebhooksGet` / `WebhooksPut` | Only version. |

Categories use the `v2` (7-level) tree by default: TikTok requires it for US, EU and SEA shops.
Pass `categoryVersion: 'v1'` for other regions. Category ids from one tree are not valid in the other.

## Notes

- Create Product takes the 202309 body; Edit and Partial Edit take the 202509 bodies. Their
  shapes differ, so mappers must target the matching `Product2023..`/`Product2025..` model.
- The SDK uses `request` without `json: true` for the token endpoints; `auth.ts` parses the text body.
- Webhook signing has no timestamp, so handlers must be idempotent (see plan 08).
