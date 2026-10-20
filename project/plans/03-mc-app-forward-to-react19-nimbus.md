# 03 — MC app: forward-to backend, React 19, Nimbus

## Decisions applied
- Service URL = `SERVICE_URL` standardConfiguration key on `mc-app` in connect.yaml (D8). Flow: deploy → Connect gives service URL → set `SERVICE_URL` → **redeploy mc-app**. `custom-application-config.mjs` reads it from env (mechanism verified in the sandbox spike). README documents the redeploy step prominently; the app shows a clear "SERVICE_URL not configured" screen if unset.
- Nimbus has LocalizedText* → no uikit exceptions; Q4 closed.
- mc-app consumes only `/service/mc/*` and `/service/tiktok/*` (route map in 01).

## 3a. Backend access via `forward-to` + express session verifier
Reference implementation to mirror: `~/code/commercetools-labs/search-config` (`app/src/hooks/use-search-config-service.ts`, `service/src/auth/merchant-center.ts`, `service/test/support/mc.ts`, connect.yaml, `docs/service-runbook.md`).

**Owner rule: NO MC permission checks.** The connector is assumed deployed into a commercetools organization, so any user who can open the custom application is trusted. Therefore: no `includeUserPermissions`, no permission-claim → role mapping (drop search-config's `rolesFor`, `SC_MC_PERMISSIONS`, `Principal.roles`), no `PERMISSIONS` gating in `mainMenuLink`/`submenuLinks`/UI. We still verify the *session* (signature, issuer, audience, expiry) — that's authentication, not permissions — and keep the project-key match (one deployment = one project, D2).

### mc-app
- `custom-application-config.mjs`: `additionalEnv: { tiktokServiceUrl: '${env:SERVICE_URL}' }`; `env.production.applicationId/url` from `CUSTOM_APPLICATION_ID`/`APPLICATION_URL`; `cloudIdentifier: '${env:CLOUD_IDENTIFIER}'`; `oAuthScopes` limited to what the UI reads/writes directly via MC GraphQL (stores, channels, product types, products; `manage_stores`/`manage_products`? — decide in step: prefer doing writes through the service to keep scopes `view_*` only). Omit `permissions` from menu links.
- Hook `useTikTokService()` (mirror of `useSearchConfigService`): reads `ctx.environment.tiktokServiceUrl`, trims trailing `/`, builds
  `createApolloContextForProxyForwardTo({ uri: `${url}/mc/graphql`... })` **only if we use GraphQL**; our service is REST, so use `executeHttpClientRequest` / `actions.forwardTo` style: `executeHttpClientRequest(async (opts)=>({...}), { userAgent, headers, forwardToConfig: { uri: `${url}/mc/...`, includeUserPermissions: false, audiencePolicy: 'forward-url-full-path' } })` — confirm exact option names with `search_docs`/appkit types when implementing (search-config uses the Apollo variant and `executeHttpClientRequest` for platform calls).
- Unset `SERVICE_URL` → "service not configured" screen explaining: deploy, copy service URL (ending `/service`), set `SERVICE_URL`, redeploy.
- Delete `use-service-url`, `ServiceUrlContext`, `use-create-api-client`, `use-connect-fetcher`, Custom-Object reads.
- "Connect Project" page → single "Authorize with TikTok" button (service `GET /service/mc/authorization-link`) + status poll (`GET /service/mc/connection-status`).

### service
- `shared/auth/mc-verifier.ts`, adapted from search-config `createMcVerifier`: `createSessionAuthVerifier({ audience: origin(CONNECT_SERVICE_URL), issuer: <from CLOUD_IDENTIFIER>, audiencePolicy, getRequestUrl })`; try `forward-url-full-path` first, `forward-url-origin` fallback (the full path keeps the `/service` prefix on Connect). Issuer mapping from `CLOUD_IDENTIFIER` (e.g. `gcp-us` → `https://mc-api.us-central1.gcp.commercetools.com`; copy search-config's `env.ts` resolution) — new standardConfiguration `CLOUD_IDENTIFIER` (required) on service + mc-app (via `inheritAs`).
- `CONNECT_SERVICE_URL` is provided by Connect to the service automatically (don't declare). `SERVICE_URL` for mc-app is NOT provided to the app by Connect → manual (D8).
- Auth middleware attached to `/service/mc/*` and `/service/tiktok/*` only; failures → 401 (invalid/unconfigured) / 403 (other project); no role logic.
- Tests (mirror `service/test/support/mc.ts` local JWKS issuer): valid token 200; missing/expired/wrong audience/wrong issuer/`alg:none` 401; other project 403; both audience policies accepted. Runs with `commercetools connect application test`.
- Local dev: mc-app `mc-scripts start` + service via `ts-node-dev`; point `CLOUD_IDENTIFIER` at a local issuer in tests only.

## 3b. React 19
Already `react 19.0.0`, `@types/react ^19`. Verify rather than change:
`react-dom 19`, `@testing-library/react 16.1` ok, `@emotion/react` ok. Check appkit 24.10.0 peer range actually allows 19 (warnings in `yarn install`), `react-intl` peer, `@apollo/client` peer. Run `tsc --noEmit`, build, smoke in browser. Possibly bump appkit to latest that officially supports React 19 / Nimbus (see 3c).

## 3c. Nimbus UI kit instead of `@commercetools-uikit/*`
~13 files import uikit (list via `grep -rl "@commercetools-uikit" mc-app/src`).
1. Use the Nimbus MCP in this environment: `list_components`, `migrate_from_uikit` per file, `get_tokens`, `search_icons`.
2. Add Nimbus packages + provider (check required appkit version — `application-shell` may need to be on a version exposing Nimbus provider; confirm via `search_docs`).
3. Map: Spacings→Stack/Flex, Text→Text/Heading, TextField/TextInput→TextInput/FormField, SelectField→Select, DataTable→DataTable, Pagination→Pagination, Notifications→toast, LoadingSpinner→LoadingSpinner, CollapsiblePanel→Accordion/Collapsible, LocalizedText*→ (Nimbus has equivalents — confirmed by owner), FlatButton/Link/Grid/Constraints/ViewSwitcher.
4. Remove `@commercetools-uikit/*`, `versions:uikit` script. Keep emotion only if still required.
5. Visual check per screen (wizard, connect, mappers, product-sync, welcome) with chrome-devtools screenshots against a dev MC.
Do after 3a (functional first), as separate commits/PR for easy review.

## Exit criteria
No `@commercetools-uikit` in package.json/imports, build+typecheck green, all screens work through forward-to against a real project.
