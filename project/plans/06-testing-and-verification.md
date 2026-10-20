# 06 — Testing & verification

| Stage | Check |
|---|---|
| After 01 | `tsc`, unit tests: sign generation (golden vector), webhook signature, token refresh timing, mapper snapshots (existing mappers). Router vs merged behaviour parity: record a few router HTTP calls (product create, order get) and compare outgoing TikTok requests byte-for-byte (sign, params). |
| After 02 | Fake-CT tests for field read/write + 409 retry; terraform `validate`/`plan` on a sandbox project. |
| After 03 | Session-JWT integration test (200/401/403); manual MC run with `mc-scripts start` + local service; screenshots for Nimbus screens. |
| After 04 | Contract tests against TikTok **sandbox/test shop** (needs test seller account + test token, per SDK README). |
| End-to-end | Sandbox CT project + Connect sandbox deploy: authorize → category/attribute fetch → publish a product → TikTok product created → inventory change → TikTok order webhook → CT order state. |
| Pre-publish | gate.mjs, anonymous-clone build. |
Also use commercetools-knowledge MCP validation for any new CT API calls (store custom field update actions, subscriptions).
