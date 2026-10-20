# TikTok Shop ↔ commercetools — consolidation & labs publish: master plan

Status: v2 (2026-10-20) — owner answers to Q1–Q8 folded in. Decisions below were confirmed by the owner.

## Goal
Turn two services (`tiktok-integration-router` + `tiktok-integration`) into ONE Connect repo,
`commercetools/tiktok-integration`, published as **commercetools-labs** (public, MIT, unsupported)
via the `presales:commercetools-labs-publish` skill. The router repo disappears.

## Confirmed decisions
| # | Decision | Consequence |
|---|---|---|
| D1 | Token/state storage = **custom fields on the TikTok Store** (`tiktok-store-type`) | No Custom Objects, no Firestore. Terraform type extended (see 02). |
| D2 | Tenancy = **one deployment = one CT project + one TikTok shop** | Each adopter registers their own TikTok partner app; `TIKTOK_APP_KEY/SECRET` become per-deployment config. No JWT between services, no app↔project map, no "service URL" lookup. |
| D3 | Target = **commercetools-labs** (not Marketplace/TikTok store) for now | Skill checklist applies (MIT, SUPPORT.md, gate.mjs, single squashed commit). Connect-marketplace certification is out of scope but not precluded. |
| D4 | Repo name = **commercetools/tiktok-integration**; npm scope `@commercetools-labs/tiktok-integration*` | |
| D6 | **No npm workspaces.** Shared code lives in a root-level `shared/` folder imported by relative path from service/event/job (Connect skill, project-structure Pattern 3). **mc-app must NOT import it** (static asset). | No spike needed (owner confirmed). `core/` in other plan files == `shared/`. |
| D7 | Tokens **encrypted** in Store fields with `ENCRYPTION_KEY` (securedConfiguration in connect.yaml, AES-256-GCM). | See 02. |
| D8 | Service URL for mc-app = a `connect.yaml` standardConfiguration variable (`SERVICE_URL`) set on mc-app; first install needs a **redeploy** once the service URL is known. | See 03a, README two-phase setup. |
| D9 | Mappers: eval'd functions replaced by declarative rules; no migration. | See 02. |
| D10 | Nimbus has `LocalizedText*` → full migration, no uikit left. Test routes/feature flag removed. Order webhook processed **inline in `service`** (it is the TikTok-called endpoint today). Router history not needed. SDK redistribution OK. | |
| D11 | Route namespaces under `/service` (below). | See 01. |
| D5 | Latest TikTok SDK supplied: `/tiktok/nodejs_sdk 2.zip` (openapi-generator 7.15.0, 93 api files vs 57 vendored today) | See 04. |

## Current state (observed)
- `tiktok-integration/`: connect.yaml with 4 apps — `mc-app` (custom app), `service`, `event`, `refresh-token-job`; terraform in `service/terraform` (+ committed `terraform.tfstate`!); `.connect/` holds sast logs; `workflow.yml` stray at root.
- `tiktok-integration-router/router-service`: Express; `/authorize-app` (TikTok OAuth callback → shows code), `/authorize-project`, `/refresh-jwt`, `/refresh-access-token`, `/webhook` (looks up shop→service_url in Firestore, forwards), JWT-protected `/tiktok/{products,orders,categories,inventory}` proxies wrapping the vendored TikTok SDK (`lib/tiktok-sdk`, signing in `generate-sign.ts`). Firestore + GCP service-account config.
- Duplicated shared code copied into `service`, `event`, `refresh-token-job` (`src/shared/...`) — three copies of commercetools-storage, router-service client, mappers, interfaces.
- mc-app: **already on React 19.0.0**, appkit 24.10.0, ~13 files import `@commercetools-uikit/*`; reads service URL from a Custom Object; has a "create API client" step.

## Target architecture
```
TikTok ──webhook / OAuth redirect──► service (/service/webhook, /service/authorize-app)
MC (forward-to + session JWT) ─────► service (/service/*, verified with @commercetools-backend/express)
service ──signed calls──► TikTok Open API (in-process SDK, no router hop)
CT subscription (PubSub/ServiceBus) ─► event app ─► shared lib ─► TikTok
job (12h) ─► shared lib: refresh TikTok token, write to Store custom fields
```
Apps in connect.yaml: `mc-app`, `service`, `event`, `refresh-token-job`. Router app removed.
Shared code moves to a root-level `core/` directory (D6, see 01) instead of 3 copies.

## Working rules (owner)
- **No MC permission checks** in mc-app or service (deployed into a commercetools org; any user of the custom app is trusted). Session verification + project-key match stay. Reference: `~/code/commercetools-labs/search-config` (minus its role mapping).
- **Never commit, never push, never touch `main`.** I only edit the working tree; owner commits. Any later branch/PR/publish step is done only on explicit request, and never directly on main.
- `core/` in 01–05 means the root `shared/` folder (D6).

## Plan documents (execute in order; each is independently reviewable)
1. `01-merge-router-into-service.md` — port router endpoints, drop JWT, drop Firestore, shared package.
2. `02-storage-custom-fields.md` — replace Custom Objects/Firestore; terraform; token lifecycle; webhook routing.
3. `03-mc-app-forward-to-react19-nimbus.md` — forward-to + express verifier; React 19 check; Nimbus migration.
4. `04-tiktok-sdk-upgrade.md` — adopt latest SDK zip, version pinning, licence question.
5. `05-labs-publish.md` — scrub, ossify, gate, publish, verify.
6. `06-testing-and-verification.md` — what "working" means at each stage.
8. `08-tiktok-webhooks.md` — verified webhook contract from Partner Center docs.

## Open items still needing the owner (non-blocking until noted)
See bottom of each doc; consolidated in `07-open-questions.md`.
