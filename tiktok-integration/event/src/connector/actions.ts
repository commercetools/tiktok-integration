import {
  AzureServiceBusDestination,
  Destination,
  GoogleCloudPubSubDestination,
} from '@commercetools/platform-sdk';
import { ByProjectKeyRequestBuilder } from '@commercetools/platform-sdk/dist/declarations/src/generated/client/by-project-key-request-builder';

const TIKTOK_CONNECTOR_SUBSCRIPTION_KEY =
  'tiktok-connector-subscription';

export async function createGcpPubSubCustomerCreateSubscription(
  apiRoot: ByProjectKeyRequestBuilder,
  topicName: string,
  projectId: string
): Promise<void> {
  const destination: GoogleCloudPubSubDestination = {
    type: 'GoogleCloudPubSub',
    topic: topicName,
    projectId,
  };
  await createSubscription(apiRoot, destination);
}

export async function createAzureServiceBusCustomerCreateSubscription(
  apiRoot: ByProjectKeyRequestBuilder,
  connectionString: string
): Promise<void> {
  const destination: AzureServiceBusDestination = {
    type: 'AzureServiceBus',
    connectionString: connectionString,
  };
  await createSubscription(apiRoot, destination);
}

async function createSubscription(
  apiRoot: ByProjectKeyRequestBuilder,
  destination: Destination
) {
  await deleteCustomerCreateSubscription(apiRoot);
  await apiRoot
    .subscriptions()
    .post({
      body: {
        key: TIKTOK_CONNECTOR_SUBSCRIPTION_KEY,
        destination,
        messages: [
          {
            resourceTypeId: 'product',
            types: [
              'ProductCreated',
              'ProductUnpublished',
              'ProductDeleted',
              'ProductPublished',
            ],
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
              'ProductTailoringCreated',
              'ProductTailoringPublished',
              'ProductTailoringDeleted',
            ],
          },
        ],
      },
    })
    .execute();
}

export async function deleteCustomerCreateSubscription(
  apiRoot: ByProjectKeyRequestBuilder
): Promise<void> {
  const {
    body: { results: subscriptions },
  } = await apiRoot
    .subscriptions()
    .get({
      queryArgs: {
        where: `key = "${TIKTOK_CONNECTOR_SUBSCRIPTION_KEY}"`,
      },
    })
    .execute();

  if (subscriptions.length > 0) {
    const subscription = subscriptions[0];

    await apiRoot
      .subscriptions()
      .withKey({ key: TIKTOK_CONNECTOR_SUBSCRIPTION_KEY })
      .delete({
        queryArgs: {
          version: subscription.version,
        },
      })
      .execute();
  }
}
