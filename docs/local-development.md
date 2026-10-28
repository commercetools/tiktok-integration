# Local development

Run the `service` and the `mc-app` on your machine against a real commercetools project.

## Why you need a public URL

The Merchant Center does not call your service from the browser. The custom application sends the request to the Merchant Center API (`/proxy/forward-to`), and **that server** calls your service. So `http://localhost:8080` does not work as `SERVICE_URL`; the service needs a public HTTPS URL. Use a tunnel such as ngrok or Cloudflare Tunnel, or deploy the service with Connect.

TikTok webhooks and the OAuth callback also need the public URL, so the same tunnel serves both.

## 1. Install and check

```console
cd <service|event|refresh-token-job|mc-app>
yarn install
yarn tsc --noEmit
yarn test
```

`mc-app` needs a clean install after dependency changes (`rm -rf node_modules && yarn install`). A partial install skips the Nimbus type generation and typecheck then fails on Nimbus props.

## 2. Configure the service

Copy `service/.env.example` to `service/.env` (gitignored) and fill in:

| Variable | Local value |
|---|---|
| `CTP_*` | An API client for your project with the scopes in `connect.yaml`. |
| `CLOUD_IDENTIFIER` | Merchant Center cloud of the project, for example `gcp-eu` or `gcp-us`. A mismatch gives 401 on `/service/mc/*`. |
| `TIKTOK_APP_KEY`, `TIKTOK_APP_SECRET` | Your TikTok Shop app. Dummy values are enough to test the Merchant Center path; TikTok calls then fail. |
| `ENCRYPTION_KEY` | `openssl rand -base64 32`. Keep it stable between runs or stored tokens become unreadable. |
| `CONNECT_SERVICE_URL` | The public URL **including** `/service`, for example `https://<id>.ngrok-free.app/service`. The service derives the token audience from its origin. |
| `PORT` | Defaults to 8080. |

Then build and start:

```console
cd service
yarn build
set -a; . ./.env; set +a
yarn start
```

Start the tunnel to the same port and check it:

```console
ngrok http 8080
curl https://<id>.ngrok-free.app/service/health   # {"status":"ok"}
```

## 3. Run the Merchant Center app

Copy `mc-app/.env.example` to `mc-app/.env.local` and set your project and application ids, then:

```console
cd mc-app
SERVICE_URL=https://<id>.ngrok-free.app/service yarn start
```

Open `http://localhost:3001/<project-key>/tiktok-connect` after logging in to the Merchant Center.

Without `SERVICE_URL` the app shows the "service not configured" screen. With it, the screens call the service through the proxy.

## ngrok free plan

The free plan answers browser-like requests that carry no ngrok cookie or skip header with an HTML warning page (`ERR_NGROK_6024`, "You are about to visit ..."). Opening the URL in Chrome works because you click **Visit Site** once and ngrok then sets a cookie for that browser. The Merchant Center API Gateway calls your service server to server, has no such cookie, and gets the page instead of your service, so the UI shows that text or no data.

Fixes, in order of preference:

- Use a tunnel without an interstitial, such as Cloudflare Tunnel, or a paid ngrok plan.
- Make ngrok add the request header `ngrok-skip-browser-warning: 1` to every request (an ngrok Traffic Policy `add-headers` action, check ngrok's docs for your plan).

Connect deployments do not have this problem.

## What to check

| Request | Expect |
|---|---|
| `GET /service/health` | 200 `{"status":"ok"}` |
| `GET /service/mc/connection-status` without a session | 401 |
| Same request from the app | 200; the wizard asks for the store, then shows **Authorize with TikTok** while no shop is connected |
| **Authorize with TikTok** | A new tab on `auth.tiktok-shops.com` with a signed `tts_state` |

The OAuth callback, product push and order webhooks need a real TikTok app key and secret and a test shop. In Partner Center set the two URLs, with the `/service` prefix and your tunnel host:

- Redirect URL: `https://<id>.ngrok-free.app/service/auth/callback`
- Webhook (callback) URL: `https://<id>.ngrok-free.app/service/webhook`

A free ngrok URL changes on every restart, so you must update both fields each time. See [the README](../README.md#the-two-urls-to-set-in-tiktok-partner-center), [setup.md](setup.md) and [webhooks.md](webhooks.md).

## Secrets

`.env` and `.env.local` are gitignored. Rotate any API client you used for local testing once you are done.
