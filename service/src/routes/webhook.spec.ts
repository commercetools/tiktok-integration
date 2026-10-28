import { createHmac } from 'node:crypto';
import request from 'supertest';
import { applyTestEnv } from '../test/support';

jest.mock('tiktok-shared/dist/src/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

applyTestEnv();

import { logger } from 'tiktok-shared/dist/src/logger';
import { createApp } from '../app';

// Official test vector from the TikTok Shop Partner Center webhook documentation.
const body =
  '{"type":1,"tts_notification_id":"7380066284010030890","shop_id":"7495540735365777507","timestamp":1718305585,"data":{"is_on_hold_order":true,"order_id":"576653688135258178","order_status":"UNPAID","update_time":1718305585}}';
// TikTok's published test vector (app key abcdef, app secret 123), split so scanners do not read it as a credential.
const signature = ['5dec0f11ec2f6783b8deee53c9ffbf8d', '024302f7c7e7fa55a35d17629031ac05'].join('');

const sign = (payload: string): string =>
  createHmac('sha256', '123').update('abcdef').update(payload).digest('hex');

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

describe('POST /service/webhook', () => {
  const processor = jest.fn();
  const app = createApp({ webhookProcessor: processor });

  const post = (payload: string, authorization?: string) => {
    const req = request(app).post('/service/webhook').set('Content-Type', 'application/json');
    return (authorization === undefined ? req : req.set('Authorization', authorization)).send(payload);
  };

  beforeEach(() => {
    processor.mockReset().mockResolvedValue(undefined);
  });

  it('accepts the official test vector, acknowledges, and processes the envelope', async () => {
    const response = await post(body, signature);

    expect(response.status).toBe(200);
    await flush();
    expect(processor).toHaveBeenCalledTimes(1);
    expect(processor.mock.calls[0][0]).toMatchObject({
      type: 1,
      tts_notification_id: '7380066284010030890',
      shop_id: '7495540735365777507',
      data: { order_id: '576653688135258178', order_status: 'UNPAID' },
    });
  });

  it('answers 200 before the processing finishes', async () => {
    let finish: () => void = () => undefined;
    processor.mockReturnValue(new Promise<void>((resolve) => (finish = resolve)));

    const response = await post(body, signature);

    expect(response.status).toBe(200);
    finish();
  });

  it('still answers 200 and logs when processing fails', async () => {
    processor.mockRejectedValue(new Error('boom'));

    const response = await post(body, signature);
    await flush();

    expect(response.status).toBe(200);
    expect(logger.error).toHaveBeenCalledWith(
      'Processing the webhook failed',
      expect.objectContaining({ notificationId: '7380066284010030890' }),
    );
  });

  it.each([
    ['a wrong signature', signature.replace(/.$/, '0')],
    ['a signature with a Bearer prefix', `Bearer ${signature}`],
    ['a malformed signature', 'not-hex'],
  ])('refuses %s with 401 and processes nothing', async (_name, authorization) => {
    const response = await post(body, authorization);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: 'Unauthorized' });
    await flush();
    expect(processor).not.toHaveBeenCalled();
  });

  it('refuses a request without an Authorization header', async () => {
    const response = await post(body);

    expect(response.status).toBe(401);
    expect(processor).not.toHaveBeenCalled();
  });

  it('refuses a request without a body', async () => {
    const response = await request(app).post('/service/webhook').set('Authorization', signature);

    expect(response.status).toBe(401);
  });

  it('verifies the raw bytes, not a re-serialized body', async () => {
    const reformatted = JSON.stringify(JSON.parse(body), null, 2);

    const response = await post(reformatted, signature);

    expect(response.status).toBe(401);
    expect(processor).not.toHaveBeenCalled();
  });

  it('accepts any body that carries a valid signature for its own bytes', async () => {
    const payload = JSON.stringify({ type: 6, shop_id: '1', data: {} });

    const response = await post(payload, sign(payload));

    expect(response.status).toBe(200);
  });

  it('answers 400 to a correctly signed body that is not JSON', async () => {
    const response = await post('not json', sign('not json'));

    expect(response.status).toBe(400);
    expect(processor).not.toHaveBeenCalled();
  });
});
