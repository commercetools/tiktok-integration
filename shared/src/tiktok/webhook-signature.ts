import { createHmac, timingSafeEqual } from 'node:crypto';

export interface VerifyWebhookSignatureInput {
  appKey: string;
  appSecret: string;
  /** The exact bytes TikTok sent; never a re-serialized object. */
  rawBody: Buffer | string;
  /** The `Authorization` header value: lowercase hex HMAC-SHA256, no scheme prefix. */
  authorization: string | undefined;
}

/**
 * `HMAC_SHA256(key = app_secret, message = app_key + rawBody)` compared in constant time.
 * TikTok signs no timestamp, so replay protection is the handler's job (idempotency).
 */
export const verifyWebhookSignature = ({
  appKey,
  appSecret,
  rawBody,
  authorization,
}: VerifyWebhookSignatureInput): boolean => {
  const signature = authorization?.trim();
  if (!signature || !/^[0-9a-f]{64}$/i.test(signature)) {
    return false;
  }
  const expected = createHmac('sha256', appSecret)
    .update(appKey)
    .update(rawBody)
    .digest();
  return timingSafeEqual(Buffer.from(signature, 'hex'), expected);
};
