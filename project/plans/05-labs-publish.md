# 05 — Publish as commercetools-labs (follows `presales:commercetools-labs-publish`)

Target: public `github.com/commercetools/tiktok-integration`, MIT, unsupported, property `commercetools-labs=true`, topic `labs`.
Do only after 01–04 are done and verified; work in a **fresh clone/copy**, not the dev tree.

## Pre-scrub checklist specific to this codebase
- Delete: `service/terraform/terraform.tfstate` (+ backup), `.connect/*/sast_*.log`, `.connect/project.toml` review, `workflow.yml` stray, all `build/` dirs, `node_modules`, `.DS_Store`, `.vscode` if personal, any `.env`, `secrets.tfvars`.
- Remove router mentions, `GCP_*`, Firestore, "partner account" internal wording; README opening rewritten (what it's for / who / result → one friendly terms line → setup).
- Replace "NOT official / NOT production ready" banner with the skill's friendly unsupported banner + `SUPPORT.md`.
- Strip `eval`-based stored functions (see 02) before going public.
- Remove stale `LICENSE` files inside `service/`,`event/`,`refresh-token-job/` (ossify refuses on nested LICENSE unless decided) — one root MIT LICENSE.
- Remove `"@commercetools-frontend"` private registry refs; check `.npmrc` absent.
- Customer/prospect names: gate will scan; also manually grep comments/test data (shop names, project keys, warehouse ids, TikTok shop ids/codes, app keys).
- TikTok SDK licence question (04/Q1).
- Secrets rotation: any TikTok app secret / CT client ever committed or in tfstate → rotate regardless of scrub.
- Terraform: ensure no tfvars; add `.gitignore` for `*.tfstate*`, `*.tfvars`, `.env`.

## Steps (mirrors the skill)
1. Fresh copy → `git fetch`-style n/a (no git repo today; there is no history to preserve — good). `git init -b main` afterwards.
2. `node <skill>/scripts/ossify.mjs --repo . --apply --year 2026` → LICENSE + `@commercetools-labs/*` names; read the refusals report. Package names: `@commercetools-labs/tiktok-integration-{service,event,refresh-token-job,mc-app}` (no core package — D6).
3. Write `SUPPORT.md`, `CONTRIBUTING.md`, README (friendly tone per skill).
4. Single commit; `git add --dry-run .` read first.
5. `node <skill>/scripts/gate.mjs --repo .` — must exit 0 (warnings need `--ack` decision); run immediately before push.
6. Create public repo (no private-then-flip), push, set `commercetools-labs=true` property (422 → org admin must define property), add topic `labs`.
7. Verify from an anonymous clone: `yarn install && typecheck && test && build` for every workspace (and `terraform validate`).
8. `git` actions need owner confirmation at the time (outward-facing); I will pause before step 6.

## Docs deliverables
README (architecture diagram, two-phase setup: deploy → register URLs in TikTok Partner Center → terraform → authorize), SUPPORT.md, CONTRIBUTING.md, `docs/setup.md`, `docs/token-storage-security.md`, `docs/webhooks.md`.
