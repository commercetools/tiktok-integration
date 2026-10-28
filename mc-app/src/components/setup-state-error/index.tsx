import { Alert, Code, Heading, List, Stack, Text } from '@commercetools/nimbus';
import { ServiceError } from '../../hooks/use-tiktok-service';

const Hints = ({ status }: { status: number | undefined }) => {
  if (status === 401) {
    return (
      <>
        <Text>
          The service refused the Merchant Center session. This usually means
          the service and this application are not set up for the same
          environment. Check, on the <Code>service</Code> application:
        </Text>
        <List.Root>
          <List.Item>
            <Code>CLOUD_IDENTIFIER</Code> is the Merchant Center cloud of this
            project, for example <Code>gcp-eu</Code> or <Code>gcp-us</Code>.
          </List.Item>
          <List.Item>
            <Code>CONNECT_SERVICE_URL</Code> is the public URL of the service
            (ending in <Code>/service</Code>), and the same URL is set as{' '}
            <Code>SERVICE_URL</Code> on <Code>mc-app</Code>.
          </List.Item>
        </List.Root>
      </>
    );
  }
  if (status === 403) {
    return (
      <Text>
        The Merchant Center session belongs to a different project than the one
        this deployment is configured for. Open the application from the project
        the connector was deployed to, or check <Code>CTP_PROJECT_KEY</Code> on
        the <Code>service</Code> application.
      </Text>
    );
  }
  return undefined;
};

/** Shown instead of the setup screens when the setup state cannot be read: the wizard would be misleading. */
const SetupStateError = ({ error }: { error: Error }) => {
  const status = error instanceof ServiceError ? error.status : undefined;
  return (
    <Stack direction="column" gap="400" maxWidth="800px">
      <Heading as="h1" size="lg">
        The setup state could not be read
      </Heading>
      <Alert.Root variant="outlined" colorPalette="critical">
        <Alert.Title>
          {status ? `The service answered with HTTP ${status}` : 'Error'}
        </Alert.Title>
        <Alert.Description>{error.message}</Alert.Description>
      </Alert.Root>
      <Hints status={status} />
      <Text>Fix the cause, then reload this page.</Text>
    </Stack>
  );
};

SetupStateError.displayName = 'SetupStateError';

export default SetupStateError;
