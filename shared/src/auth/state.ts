import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { readConfiguration } from '../config';

const DEFAULT_TTL_SECONDS = 10 * 60;
const PURPOSE = 'tiktok-oauth-state:v1';

export interface StateOptions {
  /** HMAC key; defaults to ENCRYPTION_KEY. */
  key?: Buffer;
  /** Unix seconds; defaults to now. */
  now?: number;
}

const sign = (payload: string, key: Buffer): string =>
  createHmac('sha256', key).update(PURPOSE).update(':').update(payload).digest('base64url');

const nowSeconds = (): number => Math.floor(Date.now() / 1000);

/**
 * A stateless, short-lived value for the OAuth `state` parameter:
 * `<nonce>.<expiry>.<hmac>`, keyed by ENCRYPTION_KEY.
 */
export const issueAuthState = (
  options: StateOptions & { ttlSeconds?: number } = {},
): string => {
  const key = options.key ?? readConfiguration().encryptionKey;
  const expires = (options.now ?? nowSeconds()) + (options.ttlSeconds ?? DEFAULT_TTL_SECONDS);
  const payload = `${randomBytes(16).toString('base64url')}.${expires}`;
  return `${payload}.${sign(payload, key)}`;
};

/** True for an unexpired value whose signature matches; never throws on malformed input. */
export const verifyAuthState = (
  value: string | undefined,
  options: StateOptions = {},
): boolean => {
  const parts = value?.split('.');
  if (!parts || parts.length !== 3) {
    return false;
  }
  const [nonce, expires, signature] = parts as [string, string, string];
  const key = options.key ?? readConfiguration().encryptionKey;
  const expected = Buffer.from(sign(`${nonce}.${expires}`, key));
  const received = Buffer.from(signature);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return false;
  }
  return Number(expires) > (options.now ?? nowSeconds());
};
