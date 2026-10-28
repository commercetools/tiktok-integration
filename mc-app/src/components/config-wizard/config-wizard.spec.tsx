import { screen } from '@commercetools-frontend/application-shell/test-utils';
import { renderApplicationWithRedux } from '../../test-utils';
import ConfigWizard from '.';

const mockConnectorState = jest.fn();

jest.mock('../../contexts', () => ({
  useConnectorState: () => mockConnectorState(),
}));
jest.mock('./store-config-wizard', () => () => <div>step store</div>);
jest.mock('./connect-project', () => () => <div>step authorize</div>);
jest.mock('./warehouse-config-wizard', () => () => <div>step warehouse</div>);

const renderWizard = () =>
  renderApplicationWithRedux(<ConfigWizard />, {
    route: '/my-project/tiktok-connect',
    disableRoutePermissionCheck: true,
  });

it('starts with the store', async () => {
  mockConnectorState.mockReturnValue({ connection: { connected: false } });
  renderWizard();
  await screen.findByText('step store');
});

it('authorizes TikTok once the store is chosen, before any warehouse', async () => {
  mockConnectorState.mockReturnValue({
    tiktokStore: { id: 's1' },
    connection: { connected: false },
  });
  renderWizard();
  await screen.findByText('step authorize');
});

it('chooses the warehouse only after TikTok is authorized', async () => {
  mockConnectorState.mockReturnValue({
    tiktokStore: { id: 's1' },
    connection: { connected: true },
  });
  renderWizard();
  await screen.findByText('step warehouse');
});
