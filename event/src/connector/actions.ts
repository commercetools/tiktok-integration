import type {
  ByProjectKeyRequestBuilder,
  Destination,
  MessageSubscription,
  Subscription,
  SubscriptionUpdateAction,
} from '@commercetools/platform-sdk';

export const SUBSCRIPTION_KEY = 'tiktok-connector-subscription';

/** Only the messages the event application acts on. */
export const SUBSCRIBED_MESSAGES: MessageSubscription[] = [
  {
    resourceTypeId: 'product',
    types: ['ProductUnpublished', 'ProductDeleted', 'ProductPublished'],
  },
  {
    resourceTypeId: 'inventory-entry',
    types: [
      'InventoryEntryCreated',
      'InventoryEntryDeleted',
      'InventoryEntryQuantitySet',
    ],
  },
  {
    resourceTypeId: 'product-tailoring',
    types: [
      'ProductTailoringUnpublished',
      'ProductTailoringPublished',
      'ProductTailoringDeleted',
    ],
  },
];

type Env = Record<string, string | undefined>;

const required = (env: Env, key: string): string => {
  const value = env[key];
  if (typeof value !== 'string' || value === '') {
    throw new Error(`${key} is required`);
  }
  return value;
};

/**
 * Builds the Subscription destination from the variables Connect injects into postDeploy,
 * branching on CONNECT_SUBSCRIPTION_DESTINATION. Azure Service Bus is kept for deployments
 * that still announce CONNECT_PROVIDER=AZURE.
 */
export const destinationFromEnv = (env: Env): Destination => {
  const kind =
    env.CONNECT_SUBSCRIPTION_DESTINATION ??
    (env.CONNECT_PROVIDER === 'AZURE' ? 'AzureServiceBus' : 'GoogleCloudPubSub');
  switch (kind) {
    case 'GoogleCloudPubSub':
      return {
        type: 'GoogleCloudPubSub',
        topic: required(env, 'CONNECT_GCP_TOPIC_NAME'),
        projectId: required(env, 'CONNECT_GCP_PROJECT_ID'),
      };
    case 'SNS':
      return {
        type: 'SNS',
        topicArn: required(env, 'CONNECT_AWS_TOPIC_ARN'),
        authenticationMode: 'IAM',
      };
    case 'AzureServiceBus':
      return {
        type: 'AzureServiceBus',
        connectionString: required(env, 'CONNECT_AZURE_CONNECTION_STRING'),
      };
    default:
      throw new Error(`Unknown subscription destination type: ${kind}`);
  }
};

const sameDestination = (current: Destination, desired: Destination): boolean => {
  const existing = current as unknown as Record<string, unknown>;
  return Object.entries(desired).every(([key, value]) => existing[key] === value);
};

const sameMessages = (
  current: MessageSubscription[] | undefined,
  desired: MessageSubscription[],
): boolean => {
  const normalize = (messages: MessageSubscription[]) =>
    messages
      .map(({ resourceTypeId, types }) => ({
        resourceTypeId,
        types: [...(types ?? [])].sort(),
      }))
      .sort((a, b) => a.resourceTypeId.localeCompare(b.resourceTypeId));
  return (
    JSON.stringify(normalize(current ?? [])) ===
    JSON.stringify(normalize(desired))
  );
};

const isNotFound = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { statusCode?: number }).statusCode === 404;

const getSubscription = async (
  apiRoot: ByProjectKeyRequestBuilder,
): Promise<Subscription | undefined> => {
  try {
    const { body } = await apiRoot
      .subscriptions()
      .withKey({ key: SUBSCRIPTION_KEY })
      .get()
      .execute();
    return body;
  } catch (error) {
    if (isNotFound(error)) {
      return undefined;
    }
    throw error;
  }
};

/**
 * Creates the Subscription, or converges an existing one in place, so a redeploy never leaves
 * a window without a Subscription.
 */
export const ensureSubscription = async (
  apiRoot: ByProjectKeyRequestBuilder,
  destination: Destination,
): Promise<'created' | 'updated' | 'unchanged'> => {
  const current = await getSubscription(apiRoot);
  if (!current) {
    await apiRoot
      .subscriptions()
      .post({
        body: {
          key: SUBSCRIPTION_KEY,
          destination,
          messages: SUBSCRIBED_MESSAGES,
        },
      })
      .execute();
    return 'created';
  }

  const actions: SubscriptionUpdateAction[] = [];
  if (!sameDestination(current.destination, destination)) {
    actions.push({ action: 'changeDestination', destination });
  }
  if (!sameMessages(current.messages, SUBSCRIBED_MESSAGES)) {
    actions.push({ action: 'setMessages', messages: SUBSCRIBED_MESSAGES });
  }
  if (actions.length === 0) {
    return 'unchanged';
  }
  await apiRoot
    .subscriptions()
    .withKey({ key: SUBSCRIPTION_KEY })
    .post({ body: { version: current.version, actions } })
    .execute();
  return 'updated';
};

export const deleteSubscription = async (
  apiRoot: ByProjectKeyRequestBuilder,
): Promise<boolean> => {
  const current = await getSubscription(apiRoot);
  if (!current) {
    return false;
  }
  try {
    await apiRoot
      .subscriptions()
      .withKey({ key: SUBSCRIPTION_KEY })
      .delete({ queryArgs: { version: current.version } })
      .execute();
  } catch (error) {
    if (isNotFound(error)) {
      return false;
    }
    throw error;
  }
  return true;
};
