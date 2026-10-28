import { Alert, Code, Heading, List, Stack, Text } from '@commercetools/nimbus';

/** Shown when the deployment has no `SERVICE_URL` yet. */
const ServiceNotConfigured = () => (
  <Stack direction="column" gap="400" padding="600" maxWidth="800px">
    <Heading as="h1" size="lg">
      The TikTok service is not configured
    </Heading>
    <Alert.Root variant="outlined" colorPalette="warning">
      <Alert.Description>
        This application reaches the connector&apos;s service through the
        Merchant Center, and does not know where the service is yet.
      </Alert.Description>
    </Alert.Root>
    <Text>
      The service&apos;s address is only known once Connect has deployed it. To
      finish the setup:
    </Text>
    <List.Root as="ol">
      <List.Item>
        Open the deployment in Connect and copy the URL of the{' '}
        <Code>service</Code> application. It ends in <Code>/service</Code>.
      </List.Item>
      <List.Item>
        Set the <Code>SERVICE_URL</Code> configuration variable of the{' '}
        <Code>mc-app</Code> application to that URL.
      </List.Item>
      <List.Item>Redeploy the deployment, then reload this page.</List.Item>
    </List.Root>
  </Stack>
);

ServiceNotConfigured.displayName = 'ServiceNotConfigured';

export default ServiceNotConfigured;
