import { screen } from '@commercetools-frontend/application-shell/test-utils';
import { renderApplicationWithRedux } from './test-utils';
import { entryPointUriPath } from './constants';
import { ServiceError } from './hooks/use-tiktok-service';
import ApplicationRoutes from './routes';

const mockConnectorState = jest.fn();

jest.mock('./hooks/use-tiktok-service', () => ({
  ...jest.requireActual('./hooks/use-tiktok-service'),
  useTikTokService: () => ({
    configured: true,
    url: 'https://svc.test/service',
  }),
}));
jest.mock('./contexts', () => ({
  ConnectorStateProvider: ({ children }: { children: unknown }) => children,
  useConnectorState: () => mockConnectorState(),
}));
jest.mock('./components/config-wizard', () => () => (
  <div>configuration wizard</div>
));
jest.mock('./components/welcome', () => () => <div>welcome</div>);

// NimbusProvider renders a <script> (colour-mode bootstrap); React warns about it under jsdom.
beforeEach(() => {
  const consoleError = console.error;
  jest.spyOn(console, 'error').mockImplementation((message, ...rest) => {
    if (typeof message === 'string' && message.includes('script tag')) return;
    consoleError(message, ...rest);
  });
});

const renderRoutes = () =>
  renderApplicationWithRedux(<ApplicationRoutes />, {
    route: `/my-project/${entryPointUriPath}`,
    disableRoutePermissionCheck: true,
  });

it('shows the error and not the wizard when the setup state cannot be read', async () => {
  mockConnectorState.mockReturnValue({
    showConfigWizard: true,
    loading: false,
    error: new ServiceError('Unauthorized', 401),
    stateUnknown: true,
  });
  renderRoutes();

  await screen.findByText('The setup state could not be read');
  expect(screen.getByText('Unauthorized')).toBeTruthy();
  expect(screen.queryByText('configuration wizard')).toBeNull();
});

it('keeps the screen when only a refresh failed', async () => {
  mockConnectorState.mockReturnValue({
    showConfigWizard: true,
    loading: false,
    error: new ServiceError('Unauthorized', 401),
    stateUnknown: false,
  });
  renderRoutes();

  await screen.findByText('configuration wizard');
  expect(screen.getByText('The setup state could not be read')).toBeTruthy();
});
