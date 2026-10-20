# 04 — TikTok SDK: adopt latest (`/tiktok/nodejs_sdk 2.zip`)

Facts: zip = openapi-generator 7.15.0 output, 93 `api/*Api.ts` files (versions through 2026), README says deps `request 2.88.2`, `@types/request`, `tslib`, ts ^4.9.5, Node 16+. Vendored copy in router: 57 api files, same generator style. **The zip contains no LICENSE file.**

## Steps
1. Extract to scratch dir (untrusted; don't run scripts from inside it) — diff `api/`, `model/`, `utils/` vs `router-service/src/lib/tiktok-sdk`. Report which API versions in use (product V202309/V202509…, order V202507, authorization V202309, fulfillment) have newer ones.
2. Decide vendored vs. dependency: SDK isn't on npm as far as the zip shows → vendor under `core/tiktok-sdk/` untouched (so future zips can be dropped in), with `VENDORED.md` noting source, generator version, date.
3. Move **only the used API classes** + models? Full models.ts is large; tree-shake risk vs. drop-in simplicity. Recommend vendor whole SDK, import only what's used.
4. Upgrade call sites to newest stable versions where the shape is compatible (README TODO already says "update to tiktok V2025 apis"); each bump needs mapper changes + tests (product create payload, order detail, inventory update).
5. Dependency hygiene: `request` is deprecated and vulnerable-ish; the SDK depends on it. Options: keep (pin per SDK README), or patch the SDK's http layer to `fetch`. Recommend keep for v1, note in README; revisit.
6. Sign function (`utils/generate-sign.ts`) — confirm identical in new zip.

## Redistribution (Q1 — resolved: no issue)
Vendor into `core/tiktok-sdk/` with `VENDORED.md`. Expect "foreign copyright" findings in the SDK tree from the gate; decide per finding.

## (historical) blocker
Public redistribution of TikTok's SDK without a license text: confirm TikTok terms permit it. If not clear → do not vendor into the public repo: keep SDK out of git, add `scripts/fetch-sdk.md` instructions + gitignored path, or write a minimal signed-HTTP client for the ~10 endpoints we use (also reduces bundle). The gate's "foreign copyright" check will flag headers/LICENSEs inside the SDK tree.
