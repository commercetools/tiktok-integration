import type { ByProjectKeyRequestBuilder, Destination } from '@commercetools/platform-sdk';
import {
  SUBSCRIBED_MESSAGES,
  SUBSCRIPTION_KEY,
  deleteSubscription,
  destinationFromEnv,
  ensureSubscription,
} from './actions';

const pubsub: Destination = {
  type: 'GoogleCloudPubSub',
  topic: 'topic',
  projectId: 'project',
};

const notFound = Object.assign(new Error('not found'), { statusCode: 404 });

const fakeApiRoot = (existing?: { destination: Destination; messages: unknown; version: number }) => {
  const calls = {
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const withKey = jest.fn(({ key }: { key: string }) => {
    expect(key).toBe(SUBSCRIPTION_KEY);
    return {
      get: () => ({
        execute: async () => {
          calls.get();
          if (!existing) throw notFound;
          return { body: { key: SUBSCRIPTION_KEY, ...existing } };
        },
      }),
      post: (args: unknown) => ({ execute: async () => calls.update(args) }),
      delete: (args: unknown) => ({ execute: async () => calls.remove(args) }),
    };
  });
  const apiRoot = {
    subscriptions: () => ({
      withKey,
      post: (args: unknown) => ({ execute: async () => calls.create(args) }),
    }),
  } as unknown as ByProjectKeyRequestBuilder;
  return { apiRoot, calls };
};

describe('destinationFromEnv', () => {
  it('builds a Pub/Sub destination by default', () => {
    expect(
      destinationFromEnv({ CONNECT_GCP_TOPIC_NAME: 'topic', CONNECT_GCP_PROJECT_ID: 'project' }),
    ).toEqual(pubsub);
  });

  it('builds an SNS destination', () => {
    expect(
      destinationFromEnv({ CONNECT_SUBSCRIPTION_DESTINATION: 'SNS', CONNECT_AWS_TOPIC_ARN: 'arn:aws:sns:x' }),
    ).toEqual({ type: 'SNS', topicArn: 'arn:aws:sns:x', authenticationMode: 'IAM' });
  });

  it('builds an Azure Service Bus destination for CONNECT_PROVIDER=AZURE', () => {
    expect(
      destinationFromEnv({ CONNECT_PROVIDER: 'AZURE', CONNECT_AZURE_CONNECTION_STRING: 'Endpoint=sb://x' }),
    ).toEqual({ type: 'AzureServiceBus', connectionString: 'Endpoint=sb://x' });
  });

  it('fails loudly on an unknown destination or a missing variable', () => {
    expect(() => destinationFromEnv({ CONNECT_SUBSCRIPTION_DESTINATION: 'Kafka' })).toThrow(/Unknown/);
    expect(() => destinationFromEnv({ CONNECT_GCP_TOPIC_NAME: 'topic' })).toThrow(/CONNECT_GCP_PROJECT_ID/);
  });
});

describe('ensureSubscription', () => {
  it('creates the subscription on first deploy', async () => {
    const { apiRoot, calls } = fakeApiRoot();
    await expect(ensureSubscription(apiRoot, pubsub)).resolves.toBe('created');
    expect(calls.create).toHaveBeenCalledWith({
      body: { key: SUBSCRIPTION_KEY, destination: pubsub, messages: SUBSCRIBED_MESSAGES },
    });
  });

  it('does nothing when the subscription already matches', async () => {
    const { apiRoot, calls } = fakeApiRoot({ destination: pubsub, messages: SUBSCRIBED_MESSAGES, version: 3 });
    await expect(ensureSubscription(apiRoot, pubsub)).resolves.toBe('unchanged');
    expect(calls.create).not.toHaveBeenCalled();
    expect(calls.update).not.toHaveBeenCalled();
    expect(calls.remove).not.toHaveBeenCalled();
  });

  it('updates in place, never deleting, when destination and messages drifted', async () => {
    const { apiRoot, calls } = fakeApiRoot({
      destination: { ...pubsub, topic: 'old' } as Destination,
      messages: [{ resourceTypeId: 'product', types: ['ProductCreated'] }],
      version: 3,
    });
    await expect(ensureSubscription(apiRoot, pubsub)).resolves.toBe('updated');
    expect(calls.update).toHaveBeenCalledWith({
      body: {
        version: 3,
        actions: [
          { action: 'changeDestination', destination: pubsub },
          { action: 'setMessages', messages: SUBSCRIBED_MESSAGES },
        ],
      },
    });
    expect(calls.remove).not.toHaveBeenCalled();
    expect(calls.create).not.toHaveBeenCalled();
  });
});

describe('deleteSubscription', () => {
  it('deletes an existing subscription at its current version', async () => {
    const { apiRoot, calls } = fakeApiRoot({ destination: pubsub, messages: [], version: 7 });
    await expect(deleteSubscription(apiRoot)).resolves.toBe(true);
    expect(calls.remove).toHaveBeenCalledWith({ queryArgs: { version: 7 } });
  });

  it('is a no-op when there is nothing to delete', async () => {
    const { apiRoot, calls } = fakeApiRoot();
    await expect(deleteSubscription(apiRoot)).resolves.toBe(false);
    expect(calls.remove).not.toHaveBeenCalled();
  });
});
