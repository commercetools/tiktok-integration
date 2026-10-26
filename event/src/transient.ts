const TRANSIENT_HTTP_STATUS = new Set([408, 409, 425, 429]);

const TRANSIENT_NETWORK_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'ESOCKETTIMEDOUT',
  'EAI_AGAIN',
  'ENOTFOUND',
  'EPIPE',
]);

const statusOf = (error: object): number | undefined => {
  const { statusCode, status, response } = error as {
    statusCode?: unknown;
    status?: unknown;
    response?: { statusCode?: unknown };
  };
  const value = statusCode ?? status ?? response?.statusCode;
  return typeof value === 'number' ? value : undefined;
};

/**
 * True when redelivering the message can succeed: rate limits, conflicts, server errors and
 * network failures. Everything else (bad data, missing configuration, TikTok rejections) will
 * fail the same way on every retry, so the message is acknowledged and logged instead.
 */
export const isTransientError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const status = statusOf(error);
  if (status !== undefined) {
    return status >= 500 || TRANSIENT_HTTP_STATUS.has(status);
  }
  const { code, cause } = error as { code?: unknown; cause?: unknown };
  if (typeof code === 'string' && TRANSIENT_NETWORK_CODES.has(code)) {
    return true;
  }
  return error instanceof TypeError && cause !== undefined
    ? isTransientError(cause)
    : false;
};
