# 08 — TikTok webhooks: verified contract
Source: Partner Center, "Webhooks → Overview" (`/docv2/page/tts-webhooks-overview`) and topic pages (read via browser 2026-10-20; the pages are a JS SPA, plain fetch returns an empty shell).

## Delivery
- TikTok POSTs JSON to the callback URL registered per app (Partner Center → app → Webhooks, or Event API `PUT /event/202309/webhooks` with `{address, event_type}` per shop). One URL = `https://<service>/service/webhook`.
- Envelope: `{ type:int, tts_notification_id, shop_id, timestamp(s), data:{…} }`. Creator-scope topics (e.g. 17) carry `creator_open_id` instead of `shop_id`.
- Docs say: don't rely on webhooks alone — **reconcile by scheduled polling** (orders, packages, products, returns, cancellations). → add a reconcile pass to `refresh-token-job` (or a new `job`) — new work item.
- Numeric `type` mapping is not fully published; docs say don't branch on `type` alone — use topic payload shape. Known: 1 order status, 11 cancellation, 12 return, 6 seller deauth, 7 upcoming expiry, 5 product status, 4 package, 3 address, 27 inventory status.

## Signature (use exactly)
- Header `Authorization` = lowercase hex HMAC-SHA256, **no Bearer**.
- `signature = HMAC_SHA256(key = app_secret, message = app_key + rawBody)`.
- Must use the **raw body bytes** (use `express.raw`/`verify` hook on `/service/webhook`; never re-serialize), constant-time compare (`timingSafeEqual`, check lengths first), reject missing/mismatch with 401.
- Official test vector for the unit test: app_key `abcdef`, app_secret `123`, body
  `{"type":1,"tts_notification_id":"7380066284010030890","shop_id":"7495540735365777507","timestamp":1718305585,"data":{"is_on_hold_order":true,"order_id":"576653688135258178","order_status":"UNPAID","update_time":1718305585}}`
  → `5dec0f11ec2f6783b8deee53c9ffbf8d024302f7c7e7fa55a35d17629031ac05`.
- No timestamp in signature ⇒ no replay protection ⇒ dedupe on `tts_notification_id`. Statelessness (Connect): make handlers idempotent by re-fetching the order from TikTok and comparing/setting CT order state (no dedupe store).

## Topics to subscribe (proposal, O1)
| Topic (event_type) | Why | Handler |
|---|---|---|
| ORDER_STATUS_CHANGE (1) | order sync | fetch order → create/update CT order. Status enum per docs: UNPAID, ON_HOLD, AWAITING_SHIPMENT, **AWAITING_COLLECTION**, **CANCEL**, IN_TRANSIT, DELIVERED, COMPLETED — current README/mapper uses `CANCELLED` and omits AWAITING_COLLECTION: fix |
| CANCELLATION_STATUS_CHANGE (11) | cancellations | update CT order state |
| RETURN_STATUS_CHANGE (12) | returns/refunds (13 statuses incl. REPLACEMENT_*) | order note/state; existing "type 2" handling to be re-verified |
| REVERSE_STATUS_UPDATE | buyer-raised cancel/refund needing seller action | same handler family |
| SELLER_DEAUTHORIZATION (6) | stop calls, mark store `tiktokAuthorizedAt` cleared/inactive | clear/disable stored tokens |
| UPCOMING_AUTHORIZATION_EXPIRATION (7) | 30 days before and daily until reauth | surface in MC app status screen |
| PRODUCT_STATUS_CHANGE (5) / PRODUCT_AUDIT_STATUS_CHANGE (37) | audit result of products we pushed | write status back to product (optional) |
| INVENTORY_STATUS_CHANGE (27) | optional | later |

## Registering webhooks
Prefer registering from the connector `postDeploy`/authorize callback via Event API (needs shop_cipher + access token, so after authorization — do it at the end of `/service/auth/callback`, idempotently via Get Shop Webhooks then Update). Manual Partner Center registration is the fallback; document both.

## API facts gathered
- Authorize/shop lookup: `GET /authorization/202309/shops` (`x-tts-access-token`, signed query) → `shops[{id,name,region,seller_type,cipher,code}]` — gives `shop_id`, `cipher`, `code` automatically, so `TIKTOK_SHOP_ID/NAME/CODE` config can be dropped (derive at authorize).
- `GET /authorization/202405/category_assets` is the **partner/affiliate** (user_type=3) authorization, scope `partner.authorization.info` — NOT used by this seller-side connector; ignore unless affiliate features are added. (Confirm if this URL was meant for a different purpose.)
