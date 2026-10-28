# Token storage security

## Where state lives

The connector stores everything on the commercetools Store that has `isTikTokShop = true`, as custom fields of
`tiktok-store-type` (created by [Terraform](../terraform)). That includes the TikTok **access token** and **refresh token**.

## Encryption

- Algorithm: AES-256-GCM, random 12-byte IV per write.
- Stored format: `v1:<iv>:<tag>:<ciphertext>`, each part base64. The `v1` prefix allows a later key or format version.
- Key: `ENCRYPTION_KEY` (32 bytes, base64, `openssl rand -base64 32`), held in Connect `securedConfiguration`. Connect does not echo it back.
- Integrity: GCM authenticates the data; a tampered or wrongly keyed value fails to decrypt and the connector refuses to use it (fail closed).
- Only the two tokens are encrypted. Shop id, region, locale, expiry times and warehouses are plain text.
- The TikTok **app secret** is never written to the Store. It stays in `securedConfiguration`.
- The OAuth `state` in the authorization link is an HMAC-signed, short-lived value using the same key, so the callback needs no server-side storage.

## What this protects, and what it does not

| Threat | Protected? |
|--------|------------|
| A Merchant Center user with Store read access (or an API client with `view_stores`) copies the tokens | Yes. They see ciphertext. |
| Someone exports or backs up the project data | Yes, as long as `ENCRYPTION_KEY` is not exported with it. |
| Someone with `ENCRYPTION_KEY` and read access to the Store | No. Treat the key as the master secret. |
| Someone with `manage_stores` overwrites the fields | No. They can delete or replace values and break the connection (not read it). |
| Logs | Tokens are never logged and the connection-status API never returns them. Report any place where this is not true. |

## Operating guidance

- Grant `manage_stores` only to the connector's generated API client and to people who administer it.
- Restrict who can open the Merchant Center application, since it does not check permissions itself.
- Deploy into a project and organization you trust; one deployment serves one project and one shop.
- **Rotating `ENCRYPTION_KEY`:** the stored tokens become unreadable. Change the key, redeploy, then click **Authorize with TikTok** again to store fresh tokens. Pending authorization links signed with the old key stop working.
- **Rotating the TikTok app secret:** change `TIKTOK_APP_SECRET` in Connect and redeploy. Existing tokens keep working; webhook verification uses the new secret.
- **If a token or key leaks:** deauthorize the app for the shop in TikTok Seller Center, rotate `ENCRYPTION_KEY` (and the app secret if it was exposed), redeploy, and authorize again.
- Use the least-privilege scopes in `connect.yaml`; do not substitute an admin client.

## Field size

The largest field is `mappingConfig` (JSON). Tokens and the other fields are small. If you map very many product types and
your `mappingConfig` approaches the commercetools custom field size limit, trim unused mappings.
