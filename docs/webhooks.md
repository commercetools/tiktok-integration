# TikTok webhooks

Facts here come from TikTok Shop Partner Center (Webhooks overview and topic pages). Check them again if TikTok changes
the contract.

## Delivery

TikTok sends a JSON `POST` to the callback URL registered for your app. Use `<service-url>/webhook`, where
`<service-url>` is the public URL of the `service` application and ends in `/service`.

```json
{
  "type": 1,
  "tts_notification_id": "7380066284010030890",
  "shop_id": "7495540735365777507",
  "timestamp": 1718305585,
  "data": { "order_id": "576653688135258178", "order_status": "UNPAID", "update_time": 1718305585 }
}
```

Creator-scope topics carry `creator_open_id` instead of `shop_id`; this connector does not use them.

The numeric `type` is not fully published, and TikTok advises against branching on it alone. The handler dispatches on the
payload shape of each topic. Known values: 1 order status, 3 address, 4 package, 5 product status, 6 seller
deauthorization, 7 upcoming authorization expiration, 11 cancellation, 12 return, 27 inventory status.

## Signature verification

- Header: `Authorization`, value is the **lowercase hex** HMAC-SHA256. No `Bearer` prefix.
- `signature = HMAC_SHA256(key = app_secret, message = app_key + rawBody)`.
- The **raw request bytes** are used, never a re-serialized body. `/service/webhook` is mounted with a raw body parser.
- Comparison is constant time, after a length check. Missing or wrong signature: 401, nothing processed.

Test vector (also used in the unit test): app key `abcdef`, app secret `123`, body

```
{"type":1,"tts_notification_id":"7380066284010030890","shop_id":"7495540735365777507","timestamp":1718305585,"data":{"is_on_hold_order":true,"order_id":"576653688135258178","order_status":"UNPAID","update_time":1718305585}}
```

gives `5dec0f11ec2f6783b8deee53c9ffbf8d024302f7c7e7fa55a35d17629031ac05`.

## No replay protection, so be idempotent

The signature has no timestamp. A captured valid request can be replayed. The connector accepts that because handlers
are idempotent: they re-fetch the order from TikTok and compare or set the commercetools order state, so a replay
changes nothing. There is no dedupe store (Connect applications are stateless); `tts_notification_id` is logged for tracing.

The request must be answered quickly with a 2xx. The handler acknowledges first and then processes.

## Topics

| Topic | Purpose | Handling |
|-------|---------|----------|
| `ORDER_STATUS_CHANGE` (1) | Order sync | Fetch order, create or update the commercetools order. Statuses: `UNPAID`, `ON_HOLD`, `AWAITING_SHIPMENT`, `AWAITING_COLLECTION`, `CANCEL`, `IN_TRANSIT`, `DELIVERED`, `COMPLETED`. |
| `CANCELLATION_STATUS_CHANGE` (11) | Cancellations | Update the order state. |
| `RETURN_STATUS_CHANGE` (12) | Returns and refunds | Order note and state. |
| `REVERSE_STATUS_UPDATE` | Buyer-raised cancel or refund needing seller action | Same family of handlers. |
| `SELLER_DEAUTHORIZATION` (6) | Seller removed the app | Clear stored tokens, set `tiktokDeauthorizedAt`, stop calling TikTok. |
| `UPCOMING_AUTHORIZATION_EXPIRATION` (7) | Sent 30 days before expiry, then daily | Shown in the app's status screen. |
| `PRODUCT_STATUS_CHANGE` (5), `PRODUCT_AUDIT_STATUS_CHANGE` (37) | Audit result of pushed products | Optional write-back. |
| `INVENTORY_STATUS_CHANGE` (27) | Optional | Not handled yet. |

Because this deployment has one shop, the `shop_id` in the payload must equal the stored `tiktokShopId`. A mismatch is
logged and answered with 200 so TikTok does not retry forever.

## Registering the webhook

Two ways. The first is the default.

1. **Automatic.** At the end of `GET /service/auth/callback`, after the shop is authorized, the service registers the
   topics above for the shop through the Event API (`GET` the shop's webhooks, then `PUT /event/202309/webhooks`
   with `{address, event_type}`), so re-running it is safe.
2. **Manual fallback.** In Partner Center, open your app, go to Webhooks, and enter `<service-url>/webhook` for the topics you want.

The `service` URL must be public and reachable before you register it. See [setup.md](setup.md).

## Reconcile, do not rely on webhooks alone

TikTok recommends polling as a safety net. `refresh-token-job` re-reads recent orders from TikTok on its 12-hour schedule and
repairs missing or stale commercetools orders. Run it on demand from the Connect console after an outage.

## Troubleshooting

| Symptom | Likely cause |
|---------|--------------|
| 401 on every webhook | Wrong `TIKTOK_APP_KEY` or `TIKTOK_APP_SECRET`; a proxy re-encoded the body; the URL belongs to another app. |
| Webhooks never arrive | URL not registered, or registered without the `/service` prefix; the topic is not enabled. |
| Orders stop syncing after weeks | Authorization expired or the seller deauthorized: check `connection-status` and authorize again. |
| Webhook returns 200 but no order | `shop_id` does not match `tiktokShopId`; check the logs for the mismatch line. |
