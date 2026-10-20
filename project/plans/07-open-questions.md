# 07 — Open questions

All earlier questions answered. Resolved 2026-10-20:
- N1 shared code: root `shared/` folder, relative imports, no workspaces/spike (not importable from mc-app).
- N2 `SERVICE_URL`: Connect does NOT inject it; user redeploys mc-app and sets it manually (README step).
- N3 webhook signature: verified from official docs, see `08-tiktok-webhooks.md`.
- N4 labs property: package names stay `@commercetools-labs/*`, repo lives in the `commercetools` GitHub org (property is org-level there; 422 → org admin).

## Still open
- O1 Which webhook topics do we subscribe to? Proposed list in 08 — confirm.
- O2 Existing code handles "Type 2 reverse updates" and status `CANCELLED`; docs say `CANCEL`, and numeric type for reverse events isn't published. Will verify against code in step 01 and fix.
