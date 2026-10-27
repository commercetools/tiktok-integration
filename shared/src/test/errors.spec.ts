import { describeError } from '../errors';

class HttpError extends Error {
  constructor(
    public body: unknown,
    public statusCode?: number,
  ) {
    super('HTTP request failed');
  }
}

describe('describeError', () => {
  it('adds the status and response body of an SDK HTTP error', () => {
    const error = new HttpError({ code: 36009003, message: 'Invalid order' }, 400);

    expect(describeError(error)).toBe(
      'HTTP request failed (status 400: {"code":36009003,"message":"Invalid order"})',
    );
  });

  it('keeps a text body as it is', () => {
    expect(describeError(new HttpError('Bad gateway', 502))).toBe(
      'HTTP request failed (status 502: Bad gateway)',
    );
  });

  it('leaves other errors and values alone', () => {
    expect(describeError(new Error('boom'))).toBe('boom');
    expect(describeError('plain')).toBe('plain');
  });
});
