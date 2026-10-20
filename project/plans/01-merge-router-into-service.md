# 01 — Merge router into `service`

## Why it is simple now (D2)
The router existed to multiplex many shops → many deployments. With one deployment per shop, the
service itself is the TikTok-registered API/webhook/redirect URL and needs no mapping, no JWT,
no Firestore.

## Route map for `/service` (D11) — one prefix per caller
| Prefix | Caller | Auth | Routes |
|---|---|---|---|
| `/service/webhook` | TikTok | TikTok HMAC signature (app secret) | `POST /service/webhook/order` (type 1/2 order+reverse events; single registered URL may be `/service/webhook` with dispatch on `type` — TikTok Partner Center takes one URL, so: `POST /service/webhook` → router → handlers in `webhook/` dir) |
| `/service/auth` | TikTok redirect / browser | `state` nonce | `GET /service/auth/callback` (the old `/authorize-app`) |
| `/service/tiktok` | internal/test + mc-app passthrough | MC session | `GET categories`, `categories/:id/rules`, `categories/:id/attributes`, (read-only TikTok metadata for the mapper UI) |
| `/service/mc` | MC app via forward-to | MC session JWT + projectKey check | `GET authorization-link`, `GET connection-status`, `POST full-product-sync`, `POST selective-product-sync`, `GET full-product-check`, `POST shop-config-sync`, `GET/PUT mappings` |
| `/service/health` | Connect/ops | none | `GET` |
Rules: one Express `Router` per prefix in `service/src/routes/{webhook,auth,tiktok,mc}.ts`; auth middleware attached per prefix, never per route; sync-triggering routes become POST (they mutate).
Test routes and `FEATURE_FLAG_ENABLE_TEST_TIKTOK_ROUTES` are deleted.

## Layout correction (D6)
```
connect.yaml README.md SUPPORT.md CONTRIBUTING.md LICENSE .gitignore
core/                 # shared TS source, no package.json of its own; imported as ../../core/...
service/ event/ refresh-token-job/ mc-app/ terraform/
```
Each app's tsconfig `include`s `../core`; `rootDir` set to repo root so `build/` mirrors. Folder is named `shared/` (not `core/`); verify with `commercetools connect application build` locally.

## Endpoint disposition
| Router endpoint | Fate in merged `service` |
|---|---|
| `GET /authorize-app` (TikTok redirect w/ `code`) | Moves to `service` as `GET /service/auth/callback`. Instead of *displaying* a code to copy/paste, it exchanges `code` for tokens immediately (needs app key/secret) and stores them (02). Shows a success/err HTML page (`html.utils.ts` ported). Removes the copy-token step and the temporary API client entirely. |
| `POST /authorize-project` | **Deleted.** Its work (token exchange, shop cipher, warehouses, locale) is folded into the authorize-app handler + existing `shop-config-sync`. |
| `POST /refresh-jwt`, `jwt.middleware.ts`, `JWT_*` config | **Deleted.** |
| `GET /refresh-access-token` | Becomes an internal function `refreshAccessToken()` in core; job calls it directly (no HTTP). |
| `POST /webhook` (lookup + forward) | `service` already has `POST /service/webhook` (`handleTiktokWebhook`); it becomes the registered webhook URL itself. Add TikTok signature verification (header `Authorization` HMAC with app secret) — router did not verify. Respond fast (200), process async. |
| `/tiktok/products\|orders\|categories\|inventory` proxies | **Deleted as HTTP.** Callers (`event`, `service`) call SDK wrappers in `core/tiktok/*` directly. Keep thin wrapper functions, e.g. `createProduct`, `getOrder`, `getCategories`. Signing util `generate-sign.ts` ported. |

## Steps
1. **(superseded by "Layout correction" above — root `core/`, no workspaces)** Scaffold repo layout (new working tree `tiktok-integration/`, keep old folders untouched until parity):
   ```
   connect.yaml  README.md  SUPPORT.md  CONTRIBUTING.md  LICENSE  package.json (yarn workspaces)
   core/        # (see layout correction) config, ct client, tiktok sdk wrapper, mappers, storage (store fields), logger
   service/  event/  refresh-token-job/  mc-app/  terraform/
   ```
   Use yarn workspaces; Connect builds each app dir, so each app must bundle/resolve `core`
   ((resolved, see R1) Connect `postDeploy: yarn install && yarn build` runs per app dir — a sibling workspace
   outside the app dir is NOT uploaded; see Risk R1). Fallback: build `core` into each app via
   a `prebuild` copy/`tsc` project reference + `rollup/esbuild` bundle so each app dir is self-contained.
2. **Extract duplicated `src/shared/*`** (identical in service/event/job) into `core`, dedupe diffs
   (diff the three copies first; list divergences in the PR).
3. **Port TikTok client**: `lib/tiktok-sdk` → `core/tiktok` (per 04). Config now `TIKTOK_APP_KEY` (standard),
   `TIKTOK_APP_SECRET` (secured).
4. **Port auth**: new `authorize-app` handler + token refresh function.
5. **Rewire callers**: replace `router-service/index.ts` HTTP client (`authorizeProject`, `getJwtToken`, proxy calls) with direct core calls in `service`, `event`, job. Delete `ROUTER_SERVICE_URL_ENDPOINT`.
6. **Remove**: `connect-project` endpoint, `use-create-api-client`, `SHARED_SHOP_SERVICE_URL_*`, post-deploy "store service URL", event post-deploy "announce topic to router".
7. **connect.yaml**: add `TIKTOK_APP_KEY` (standard), `TIKTOK_APP_SECRET` (secured), `TIKTOK_APP_AUTHORIZATION_LINK` optional; drop `ROUTER_SERVICE_URL_ENDPOINT`; keep `CTP_*`. `TIKTOK_SHOP_ID/NAME/CODE`: reassess — shop id/cipher now come from the authorize step (store fields), so make them optional/remove (decide in 02).
8. **Webhook (decided: inline in service)**. Previously: today TikTok webhooks arrive via router → service `/webhook` → (Pub/Sub topic announced to router → event). Simplify: `service /webhook` verifies and either (a) processes order sync inline, or (b) republishes to the event app. Recommended (a) unless order sync is slow; order-sync code currently lives in `service/shared/services/update-order.service.ts` so (a) is the existing shape.
9. Delete `tiktok-integration-router` from the publish tree (keep the folder locally as reference until done).

## Risks
- **R1** (resolved) Shared code = root `shared/` folder, relative imports, per Connect skill; no spike, no esbuild fallback. mc-app never imports `shared/`.
- **R2** Webhook latency: TikTok expects a fast 2xx; keep handler async with retry-safe idempotency (key on order id + status).
- **R3** Public URL must exist before TikTok app registration: Connect service URL is only known after first deploy → document two-phase setup (deploy → copy URLs → register in Partner Center → authorize).

## Exit criteria
No import of `@google-cloud/firestore`, `jsonwebtoken`, `ROUTER_SERVICE_URL_ENDPOINT` anywhere; `tsc` clean in all packages; service exposes authorize-app + webhook + sync endpoints; unit tests for sign, webhook verify, token refresh.
