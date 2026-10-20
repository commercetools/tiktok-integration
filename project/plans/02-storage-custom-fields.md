# 02 — Replace Custom Objects & Firestore with Store custom fields (D1)

## Inventory of what is persisted today
| Data | Today | Target |
|---|---|---|
| App↔project↔shop mapping (shop_id, cipher, region, locale, warehouses, code consumed) | Firestore (router) | Not needed as a mapping (D2). Shop facts → Store custom fields |
| TikTok access/refresh token + expiries | Custom Object | Store custom fields |
| JWT + expiry | Custom Object | **Deleted** |
| Service URL | Custom Object | **Deleted** (MC uses forward-to; 03) |
| Shop config (cipher, region, locale, warehouse map) | Custom Object | Store custom fields (JSON string) |
| TikTok categories cache | Custom Object (`storeCategories`) | Don't persist: fetch on demand + in-memory TTL cache |
| Product-type→category, SKU/product attribute mappers (MC "mappers" UI; contains **base64-encoded function strings + eval**) | Custom Object | Needs a decision — see Q3. Recommended: store as JSON field on Store (`mappingConfig`), and replace eval'd functions with declarative mapping rules (attribute name / value map / transform enum). `eval` of stored code is a security finding for a public repo. |

## Terraform: extend `tiktok-store-type`
Add fields (all on the existing type): `tiktokShopId`, `tiktokShopCipher`, `tiktokRegion`, `tiktokLocale`,
`tiktokWarehouses` (String JSON), `tiktokAccessToken`, `tiktokRefreshToken`, `tiktokAccessExpiresAt`,
`tiktokRefreshExpiresAt` (Number), `tiktokAuthorizedAt`, `mappingConfig` (String JSON).
Existing: `isTikTokShop`. Channels keep `isTikTokWarehouse/isTikTokPrice/warehouseId/warehouseEntityId`.
CT custom string fields cap at ~ 100 KB? Verify limits (field value ≤ 256 KB for resource; confirm via knowledge MCP) — tokens are small; `mappingConfig` is the size risk.

## Encryption (D7)
`ENCRYPTION_KEY` in connect.yaml `securedConfiguration` (required, 32-byte base64). `core/crypto.ts`: AES-256-GCM, random 12-byte IV, stored as `v1:<iv>:<tag>:<ct>` base64 in `tiktokAccessToken`/`tiktokRefreshToken`. `v1` prefix permits later key versions; rotating the key requires re-authorizing (documented). Unit tests: roundtrip, tamper detection, wrong key. Non-secret facts (shop id, region, expiries) stay plaintext.

## Mappers (D9)
Replace `encodeFunctionToBase64/decodeFunctionFromBase64` (eval). Declarative schema in `core/mappings/schema.ts`, validated (zod): per product type → `{ categoryId, productAttributes:[{ct, tiktokAttributeId, valueMap?, transform?: identity|lowercase|uppercase|number|boolean|enumKeyToLabel|localizedPick}], skuAttributes:[…] }`. MC mappers screen edits it via `/service/mc/mappings`. Stored in `mappingConfig`; if it exceeds CT field limits, split per product type across fields.

## Security caveat (must be documented)
Custom fields are visible to anyone with Store view access / MC. Tokens in a Store field are a
weaker boundary than Custom Objects with restricted scopes. Mitigations: (a) separate API-client scopes so
only the connector can `manage_stores`; (b) document that MC users with store read can see tokens; (c) mask in MC app
UI and logs; (d) optional follow-up: encrypt at rest with an `ENCRYPTION_KEY` in Connect securedConfiguration (AES-GCM) — recommended, small cost.
Not storing the app secret there (stays in securedConfiguration).

## Token lifecycle
- authorize-app: code → tokens → write fields on the store with `isTikTokShop=true` (look up that store; error if none).
- Refresh job (every 12h): read fields, refresh if `access expires < now+24h`, write back using `version` for optimistic concurrency; on 409 re-read.
- Concurrency: service/event may also read tokens; read-through helper `getValidAccessToken()` that refreshes lazily if expired (so the job is a safety net, not the only path).

## Webhook routing
One shop per deployment: verify `shop_id` equals stored `tiktokShopId`; mismatch → 200 + log (don't make TikTok retry forever) or 400 per TikTok guidance (check docs).

## Steps
1. Terraform fields + migration note for existing adopters (none public yet → none).
2. `core/storage/store-fields.ts`: `getTikTokStore()`, `readState()`, `writeState(patch)` (update actions `setCustomField`), in-memory cache with short TTL.
3. Replace all `custom-object.controller` usage (grep `createOrUpdateCustomObject|readCustomObject`); delete the controller and `SHARED_SHOP_*` constants.
4. Remove `GCP_*` and Firestore config.
5. Tests: fake CT client; optimistic-concurrency retry.

## Exit criteria
`grep -ri "customObject\|custom-object\|firestore"` returns nothing in source (docs may mention history).
