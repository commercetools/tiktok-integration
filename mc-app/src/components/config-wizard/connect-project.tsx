import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  LoadingSpinner,
  Stack,
  Text,
} from '@commercetools/nimbus';
import { useConnectorState } from '../../contexts';
import { useTikTokService } from '../../hooks/use-tiktok-service';
import ErrorAlert from '../ui/error-alert';
import Page from '../ui/page';

const POLL_MS = 3000;

/**
 * Authorizes the shop: the service issues a TikTok authorization link, the
 * user approves it in a new tab, and TikTok redirects back to the service,
 * which stores the tokens. This screen only waits for the connection.
 */
const ConnectProject = () => {
  const service = useTikTokService();
  const { refreshConnection } = useConnectorState();
  const [waiting, setWaiting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<Error | undefined>();

  useEffect(() => {
    if (!waiting) return undefined;
    const timer = setInterval(() => void refreshConnection(), POLL_MS);
    return () => clearInterval(timer);
  }, [waiting, refreshConnection]);

  const authorize = async () => {
    if (!service.client) return;
    setStarting(true);
    setError(undefined);
    try {
      const { url } = await service.client.getAuthorizationLink();
      window.open(url, '_blank', 'noopener,noreferrer');
      setWaiting(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error(String(caught)));
    } finally {
      setStarting(false);
    }
  };

  return (
    <Page
      title="Configuration Wizard"
      description="Step 2 of 3: connect this project to your TikTok Shop."
    >
      <Card.Root variant="outlined-elevated">
        <Card.Body>
          <Stack direction="column" gap="300">
            <Text fontWeight="600">Authorize with TikTok</Text>
            <Text color="neutral.11">
              TikTok opens in a new tab. Sign in as the shop&apos;s seller and
              approve the access. You come back to this page automatically.
            </Text>
            <div>
              <Button
                variant="solid"
                colorPalette="primary"
                onPress={() => void authorize()}
                isDisabled={starting}
              >
                {waiting
                  ? 'Open the TikTok link again'
                  : 'Authorize with TikTok'}
              </Button>
            </div>
            {waiting && (
              <Stack direction="row" gap="200" alignItems="center">
                <LoadingSpinner size="xs" />
                <Text color="neutral.11">
                  Waiting for TikTok to confirm the authorization...
                </Text>
              </Stack>
            )}
          </Stack>
        </Card.Body>
      </Card.Root>
      {error && (
        <ErrorAlert
          title="The authorization could not be started"
          error={error}
        />
      )}
      {waiting && (
        <Alert.Root variant="outlined" colorPalette="info">
          <Alert.Description>
            Nothing happens after you approve? Check that the redirect URL
            registered in the TikTok Partner Center is this deployment&apos;s
            service URL followed by /auth/callback.
          </Alert.Description>
        </Alert.Root>
      )}
    </Page>
  );
};

ConnectProject.displayName = 'ConnectProject';

export default ConnectProject;
