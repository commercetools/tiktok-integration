import request from 'supertest';
import app from '../app';
import { isAuthorized } from 'tiktok-shared/dist/src/state';
import { handleMessage } from '../handlers';

jest.mock('tiktok-shared/dist/src/state', () => ({ isAuthorized: jest.fn() }));
jest.mock('../handlers', () => ({ handleMessage: jest.fn() }));
jest.mock('tiktok-shared/dist/src/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const isAuthorizedMock = jest.mocked(isAuthorized);
const handleMessageMock = jest.mocked(handleMessage);

const push = (payload: unknown) => ({
  message: { data: Buffer.from(JSON.stringify(payload)).toString('base64') },
});

const productPublished = {
  notificationType: 'Message',
  resource: { typeId: 'product', id: 'p-1' },
  type: 'ProductPublished',
};

describe('POST /event', () => {
  beforeEach(() => {
    isAuthorizedMock.mockResolvedValue(true);
    handleMessageMock.mockResolvedValue(undefined);
  });

  it('handles a message and acknowledges with 204', async () => {
    await request(app).post('/event').send(push(productPublished)).expect(204);
    expect(handleMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ProductPublished' }),
    );
  });

  it('acknowledges non-Message notifications without handling them', async () => {
    await request(app)
      .post('/event')
      .send(push({ notificationType: 'ResourceCreated', resource: { typeId: 'product', id: 'p-1' } }))
      .expect(200);
    expect(handleMessageMock).not.toHaveBeenCalled();
  });

  it('skips processing until the shop is authorized, and acknowledges', async () => {
    isAuthorizedMock.mockResolvedValue(false);
    await request(app).post('/event').send(push(productPublished)).expect(200);
    expect(handleMessageMock).not.toHaveBeenCalled();
  });

  it.each([
    ['a body without a message', {}],
    ['data that is not base64 JSON', { message: { data: '@@@' } }],
    ['a message without a resource', push({ notificationType: 'Message' })],
  ])('acknowledges and drops %s', async (_name, body) => {
    await request(app).post('/event').send(body).expect(200);
    expect(handleMessageMock).not.toHaveBeenCalled();
  });

  it('acknowledges and drops a body that is not JSON', async () => {
    await request(app)
      .post('/event')
      .set('Content-Type', 'application/json')
      .send('{not json')
      .expect(200);
    expect(handleMessageMock).not.toHaveBeenCalled();
  });

  it('asks for redelivery on a transient failure', async () => {
    handleMessageMock.mockRejectedValue({ statusCode: 503 });
    await request(app).post('/event').send(push(productPublished)).expect(503);
  });

  it('asks for redelivery when the authorization check itself fails transiently', async () => {
    isAuthorizedMock.mockRejectedValue({ statusCode: 502 });
    await request(app).post('/event').send(push(productPublished)).expect(503);
  });

  it('acknowledges a permanent failure instead of looping', async () => {
    handleMessageMock.mockRejectedValue(new Error('Product draft is invalid'));
    await request(app).post('/event').send(push(productPublished)).expect(200);
  });

  it('answers 404 for other paths', async () => {
    await request(app).post('/elsewhere').send({}).expect(404);
  });
});
