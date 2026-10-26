/** Raised by `readConfiguration` with the names of the offending keys, never their values. */
export class ConfigurationError extends Error {
  readonly problems: string[];

  constructor(problems: string[]) {
    super(`Invalid configuration: ${problems.join('; ')}`);
    this.name = 'ConfigurationError';
    this.problems = problems;
  }
}

/** Encryption, decryption or key-format failure. Messages never contain plaintext or key material. */
export class CryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CryptoError';
  }
}

/** No Store carries `isTikTokShop=true` (the Terraform setup was not applied or the flag is unset). */
export class StoreNotFoundError extends Error {
  constructor() {
    super('No store with the custom type "tiktok-store-type" and isTikTokShop=true was found');
    this.name = 'StoreNotFoundError';
  }
}

/** The TikTok shop has not been authorized, was deauthorized, or its refresh token expired. */
export class NotAuthorizedError extends Error {
  constructor(message = 'The TikTok shop is not authorized. Authorize the app from the Merchant Center.') {
    super(message);
    this.name = 'NotAuthorizedError';
  }
}

/** A TikTok Shop API (or auth endpoint) response with a non-zero `code`. */
export class TikTokApiError extends Error {
  readonly code: number | undefined;
  readonly requestId: string | undefined;

  constructor(message: string, code?: number, requestId?: string) {
    super(message);
    this.name = 'TikTokApiError';
    this.code = code;
    this.requestId = requestId;
  }
}

/** Merchant Center session verification failure; `reason` maps to the HTTP status (401, 401, 403). */
export class McAuthError extends Error {
  readonly reason: 'unconfigured' | 'invalid' | 'other-project';

  constructor(reason: McAuthError['reason'], message: string) {
    super(message);
    this.name = 'McAuthError';
    this.reason = reason;
  }
}

/**
 * A log-friendly message. The vendored SDK rejects non-2xx replies with an `HttpError` whose message
 * is only "HTTP request failed"; the reason is in its status code and response body.
 */
export const describeError = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return String(error);
  }
  const { statusCode, body } = error as { statusCode?: unknown; body?: unknown };
  if (typeof statusCode !== 'number') {
    return error.message;
  }
  const detail = typeof body === 'string' ? body : JSON.stringify(body);
  return `${error.message} (status ${statusCode}${detail ? `: ${detail}` : ''})`;
};
