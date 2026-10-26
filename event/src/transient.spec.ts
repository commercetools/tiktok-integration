import { isTransientError } from './transient';

describe('isTransientError', () => {
  it.each([429, 409, 408, 500, 502, 503])('treats HTTP %i as transient', (statusCode) => {
    expect(isTransientError({ statusCode })).toBe(true);
  });

  it.each([400, 401, 403, 404, 422])('treats HTTP %i as permanent', (statusCode) => {
    expect(isTransientError({ statusCode })).toBe(false);
  });

  it('reads the status from a nested response', () => {
    expect(isTransientError({ response: { statusCode: 503 } })).toBe(true);
  });

  it('treats network error codes as transient', () => {
    expect(isTransientError(Object.assign(new Error('x'), { code: 'ECONNRESET' }))).toBe(true);
  });

  it('unwraps the cause of a failed fetch', () => {
    const error = Object.assign(new TypeError('fetch failed'), {
      cause: Object.assign(new Error('x'), { code: 'ETIMEDOUT' }),
    });
    expect(isTransientError(error)).toBe(true);
  });

  it('treats ordinary errors and non-errors as permanent', () => {
    expect(isTransientError(new Error('bad data'))).toBe(false);
    expect(isTransientError('boom')).toBe(false);
    expect(isTransientError(undefined)).toBe(false);
  });
});
