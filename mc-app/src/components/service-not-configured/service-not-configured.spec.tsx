import { screen } from '@commercetools-frontend/application-shell/test-utils';
import { renderApplicationWithRedux } from '../../test-utils';
import { entryPointUriPath } from '../../constants';
import ApplicationRoutes from '../../routes';

// NimbusProvider renders a <script> (colour-mode bootstrap); React warns about it under jsdom.
beforeEach(() => {
  const consoleError = console.error;
  jest.spyOn(console, 'error').mockImplementation((message, ...rest) => {
    if (typeof message === 'string' && message.includes('script tag')) return;
    consoleError(message, ...rest);
  });
});

it('explains how to configure the service when SERVICE_URL is not set', async () => {
  renderApplicationWithRedux(<ApplicationRoutes />, {
    route: `/my-project/${entryPointUriPath}`,
    disableRoutePermissionCheck: true,
  });

  await screen.findByText('The TikTok service is not configured');
  expect(screen.getAllByText('SERVICE_URL').length).toBeGreaterThan(0);
});
