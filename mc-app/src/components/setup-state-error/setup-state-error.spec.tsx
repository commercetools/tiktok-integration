import { NimbusProvider } from '@commercetools/nimbus';
import { screen } from '@commercetools-frontend/application-shell/test-utils';
import { renderApplicationWithRedux } from '../../test-utils';
import { ServiceError } from '../../hooks/use-tiktok-service';
import SetupStateError from '.';

// NimbusProvider renders a <script> (colour-mode bootstrap); React warns about it under jsdom.
beforeEach(() => {
  const consoleError = console.error;
  jest.spyOn(console, 'error').mockImplementation((message, ...rest) => {
    if (typeof message === 'string' && message.includes('script tag')) return;
    consoleError(message, ...rest);
  });
});

const renderError = (error: Error) =>
  renderApplicationWithRedux(
    <NimbusProvider loadFonts={false}>
      <SetupStateError error={error} />
    </NimbusProvider>,
    {
      route: '/my-project/tiktok-connect',
      disableRoutePermissionCheck: true,
    }
  );

it('says the setup state could not be read and shows the service message', async () => {
  renderError(new ServiceError('Unauthorized', 401));

  await screen.findByRole('heading', {
    name: 'The setup state could not be read',
  });
  expect(screen.getByText('Unauthorized')).toBeTruthy();
  expect(screen.getByText('The service answered with HTTP 401')).toBeTruthy();
  expect(screen.getAllByText('CLOUD_IDENTIFIER').length).toBeGreaterThan(0);
});

it('points to the project for a 403', async () => {
  renderError(new ServiceError('Unauthorized', 403));

  await screen.findByText('The service answered with HTTP 403');
  expect(screen.getByText('CTP_PROJECT_KEY')).toBeTruthy();
});

it('shows only the message for other errors', async () => {
  renderError(new Error('Network down'));

  await screen.findByText('Network down');
  expect(screen.queryByText('CLOUD_IDENTIFIER')).toBeNull();
});
