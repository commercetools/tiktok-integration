import { BadEnvelopeError, decodeEnvelope } from './envelope';

const wrap = (payload: unknown) => ({
  message: {
    data: Buffer.from(
      typeof payload === 'string' ? payload : JSON.stringify(payload),
    ).toString('base64'),
  },
});

const validMessage = {
  notificationType: 'Message',
  resource: { typeId: 'product', id: 'p-1' },
  type: 'ProductPublished',
};

describe('decodeEnvelope', () => {
  it('decodes a base64 Pub/Sub push into the subscription message', () => {
    expect(decodeEnvelope(wrap(validMessage))).toMatchObject(validMessage);
  });

  it('keeps unknown fields of the message', () => {
    const decoded = decodeEnvelope(wrap({ ...validMessage, sequenceNumber: 4 }));
    expect(decoded).toMatchObject({ sequenceNumber: 4 });
  });

  it.each([
    ['no body', undefined],
    ['a body without message', {}],
    ['a message without data', { message: {} }],
    ['empty data', { message: { data: '' } }],
    ['data that is not a string', { message: { data: 5 } }],
    ['data that is not JSON', wrap('not json')],
    ['JSON that is not an object', wrap('[1,2]')],
    ['a missing notificationType', wrap({ resource: validMessage.resource })],
    ['a missing resource', wrap({ notificationType: 'Message' })],
    ['a resource without id', wrap({ notificationType: 'Message', resource: { typeId: 'product' } })],
  ])('rejects %s', (_name, body) => {
    expect(() => decodeEnvelope(body)).toThrow(BadEnvelopeError);
  });
});
