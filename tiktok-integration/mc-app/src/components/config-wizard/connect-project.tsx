import { useEffect, useState } from 'react';
import { useApplicationContext } from '@commercetools-frontend/application-shell-connectors';
import Constraints from '@commercetools-uikit/constraints';
import Spacings from '@commercetools-uikit/spacings';
import Text from '@commercetools-uikit/text';
import PrimaryButton from '@commercetools-uikit/primary-button';
import SecondaryButton from '@commercetools-uikit/secondary-button';
import Card from '@commercetools-uikit/card';
import TextField from '@commercetools-uikit/text-field';
import { useServiceUrl } from '../../contexts';
import { useConnectProject } from '../../hooks/use-service-url';
import { useCreateApiClient } from '../../hooks/use-create-api-client';
import LoadingSpinner from '@commercetools-uikit/loading-spinner';

const ConnectProject = () => {
  const { project } = useApplicationContext((context) => ({
    project: context.project,
    environment: context.environment,
  }));
  const { serviceUrl } = useServiceUrl();
  const { connectProject, getAuthorizationLink, loading } = useConnectProject();
  const { createApiClient, loading: creatingApiClient } = useCreateApiClient(project?.key || '');
  const [authorizationLink, setAuthorizationLink] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);
  const [apiClientError, setApiClientError] = useState<string>('');
  const [apiClientResult, setApiClientResult] = useState<{
    clientId: string;
    clientSecret: string;
    name: string;
    scope: string;
  } | null>(null);

  const handleCreateApiClient = async () => {
    try {
      setApiClientError('');
      const result = await createApiClient();
      setApiClientResult(result);
    } catch (err) {
      setApiClientError(err instanceof Error ? err.message : 'Failed to create API client');
    }
  };

  const handleConnect = async () => {
    if (!token.trim()) {
      setError('Token is required');
      return;
    }

    if (!serviceUrl) {
      setError('Service URL is not available');
      return;
    }

    if (!apiClientResult) {
      setError('API client must be created first');
      return;
    }

    try {
      setError('');
      await connectProject(
        token,
        apiClientResult.clientId,
        apiClientResult.clientSecret,
        'us-central1.gcp' // TODO: get region from environment
      );
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect project');
    }
  };

  useEffect(() => {
    getAuthorizationLink().then((link) => {
      setAuthorizationLink(link);
    }).catch((err) => {
      setError(err instanceof Error ? err.message : 'Failed to get authorization link');
    });
  }, []);

  return (
    <Constraints.Horizontal max={16}>
      <Spacings.Stack scale="xl">
        <Text.Headline as="h1">Configuration Wizard</Text.Headline>
        <Text.Body>
          Connect your project to your TikTok account.
        </Text.Body>

        {authorizationLink && (
          <Card theme="light" type="raised">
            <Spacings.Stack scale="m">
              <Text.Subheadline as="h4">Use this link to authorize your project</Text.Subheadline>
              <Text.Body>
                <a href={authorizationLink} target="_blank" rel="noopener noreferrer">
                  {authorizationLink}
                </a>
              </Text.Body>
            </Spacings.Stack>
          </Card>
        )}
        <Card theme="light" type="raised">
          <Spacings.Stack scale="m">
            <TextField
              title="Token"
              name="token"
              value={token}
              hint="Enter your token you got from TikTok authorization api"
              onChange={(event) => setToken(event.target.value)}
              isRequired
              isDisabled={loading || success}
              placeholder="Enter your token"
            />
          </Spacings.Stack>
        </Card>

        <Card theme="light" type="raised">
          <Spacings.Stack scale="m">
            <Text.Subheadline as="h4">Create an API client for connection</Text.Subheadline>
            
            {!apiClientResult ? (
              <Spacings.Stack scale="s">
                <Text.Body>
                  Create a new API client to use for connecting your project.
                </Text.Body>
                <Spacings.Inline scale="s" justifyContent='flex-start'>
                <SecondaryButton
                  label="Create API Client"
                  onClick={handleCreateApiClient}
                  iconRight={creatingApiClient ? <LoadingSpinner /> : undefined}
                  isDisabled={creatingApiClient || !token}
                />
                </Spacings.Inline>
              </Spacings.Stack>
            ) : (
              <Spacings.Stack scale="s">
                <Text.Body tone="positive">API Client created successfully!</Text.Body>
                <div style={{ 
                  padding: '12px', 
                  backgroundColor: '#f5f5f5', 
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontSize: '13px'
                }}>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Client ID:</strong> {apiClientResult.clientId}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Client Secret:</strong> ••••••••••••••••
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Name:</strong> {apiClientResult.name}
                  </div>
                  <div>
                    <strong>Scope:</strong> {apiClientResult.scope}
                  </div>
                </div>
              </Spacings.Stack>
            )}

            {apiClientError && (
              <Text.Body tone="critical">{apiClientError}</Text.Body>
            )}
          </Spacings.Stack>
        </Card>

        {error && (
          <Card theme="light" type="flat">
            <Text.Body tone="critical">{error}</Text.Body>
          </Card>
        )}

        {success && (
          <Card theme="light" type="flat">
            <Text.Body tone="positive">
              Successfully connected project!
            </Text.Body>
          </Card>
        )}
        <Spacings.Inline scale="m">
          <PrimaryButton
            label="Connect"
            onClick={handleConnect}
            iconRight={loading ? <LoadingSpinner /> : undefined}
            isDisabled={loading || success || !token.trim() || !apiClientResult}
          />
        </Spacings.Inline>
      </Spacings.Stack>
    </Constraints.Horizontal>
  );
};

ConnectProject.displayName = 'ConnectProject';

export default ConnectProject;
