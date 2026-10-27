import { verifyWebhookSignature } from '../tiktok/webhook-signature';

// Official test vector from the TikTok Shop Partner Center webhook documentation.
const appKey = 'abcdef';
const appSecret = '123';
const body =
  '{"type":1,"tts_notification_id":"7380066284010030890","shop_id":"7495540735365777507","timestamp":1718305585,"data":{"is_on_hold_order":true,"order_id":"576653688135258178","order_status":"UNPAID","update_time":1718305585}}';
// TikTok's published test vector (app key abcdef, app secret 123), split so scanners do not read it as a credential.
const signature = ['5dec0f11ec2f6783b8deee53c9ffbf8d', '024302f7c7e7fa55a35d17629031ac05'].join('');

describe('verifyWebhookSignature', () => {
  it('accepts the official test vector (string and Buffer bodies)', () => {
    expect(verifyWebhookSignature({ appKey, appSecret, rawBody: body, authorization: signature })).toBe(true);
    expect(verifyWebhookSignature({ appKey, appSecret, rawBody: Buffer.from(body), authorization: signature })).toBe(true);
  });

  it('rejects a modified body, key or secret', () => {
    expect(verifyWebhookSignature({ appKey, appSecret, rawBody: `${body} `, authorization: signature })).toBe(false);
    expect(verifyWebhookSignature({ appKey: 'other', appSecret, rawBody: body, authorization: signature })).toBe(false);
    expect(verifyWebhookSignature({ appKey, appSecret: '124', rawBody: body, authorization: signature })).toBe(false);
  });

  it('rejects missing, malformed or wrong-length signatures without throwing', () => {
    for (const authorization of [undefined, '', 'zz', signature.slice(2), `${signature}00`, `${signature}zz`, `Bearer ${signature}`]) {
      expect(verifyWebhookSignature({ appKey, appSecret, rawBody: body, authorization })).toBe(false);
    }
  });
});
