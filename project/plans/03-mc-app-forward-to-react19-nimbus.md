# 03 — MC app: forward-to backend, React 19, Nimbus

## Decisions applied
- Service URL = `SERVICE_URL` standardConfiguration key on `mc-app` in connect.yaml (D8). Flow: deploy → Connect gives service URL → set `SERVICE_URL` → **redeploy mc-app**. `custom-application-config.mjs` reads it from env (mechanism verified in the sandbox spike). README documents the redeploy step prominently; the app shows a clear "SERVICE_URL not configured" screen if unset.
- Nimbus has LocalizedText* → no uikit exceptions; Q4 closed.
- mc-app consumes only `/service/mc/*` and `/service/tiktok/*` (route map in 01).

## 3a. Backend access via `forward-to` + express session verifier
Replace "read service URL from Custom Object, call it with fetch" with the MC proxy:
- `custom-application-config.mjs`: add `additionalOAuthScopes` as needed and a
  `headers.csp` `connect-src` is NOT needed for forward-to (same-origin MC proxy).
- mc-app calls `https://mc-api.<region>.commercetools.com/proxy/forward-to` via `actions-global`/`executeHttpClientRequest` with `forwardTo: { uri: <service URL>, ... }` — the service URL is known to the MC app only through config. Source options (pick in Q2): (i) Connect `ENTRY_POINT`-style env injected into the mc-app deployment (`mc-app` `standardConfiguration` key `SERVICE_URL`, set at install), or (ii) `customApplication` `env` via `custom-application-config` `env.production.url` + `{{...}}` — verify supported placeholders.
- Service: add `@commercetools-backend/express` `createSessionAuthVerifier` middleware on all `/service/*` routes **except** `/service/webhook` and `/service/authorize-app`. Config: `audience` = service URL (set via `CONNECT_SERVICE_URL`-style env), `issuer` = `https://mc-api.<region>.commercetools.com`; `inferProjectKey: true`; check `projectKey === CTP_PROJECT_KEY`.
- Delete: `use-service-url`, `use-create-api-client`, `ServiceUrlContext`, `use-connect-fetcher` (rewrite on forward-to), the "Connect Project" page's token-paste/API-client UI → becomes a single "Authorize with TikTok" button that opens `TIKTOK_APP_AUTHORIZATION_LINK` (returned by `GET /service/authorization-link`) and polls `GET /service/connection-status`.
- Local dev: `mc-dev-authentication` + `ts-node-dev` service with verifier pointing at the dev issuer; document.
- Verification (as owner requested "use forward-to and CT express backend to verify"): integration test that sends a real MC session JWT → 200; missing/invalid → 401; wrong project → 403.

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
