import { NimbusProvider } from '@commercetools/nimbus';
import {
  fireEvent,
  screen,
  waitFor,
} from '@commercetools-frontend/application-shell/test-utils';
import { renderApplicationWithRedux } from '../../test-utils';
import WarehouseConfigWizard from './warehouse-config-wizard';

const mockShowNotification = jest.fn();
const mockUpdateChannelCustom = jest.fn();
const mockConnectorState = jest.fn();

jest.mock('@commercetools-frontend/actions-global', () => ({
  useShowNotification: () => mockShowNotification,
}));
jest.mock('../../contexts', () => ({
  useConnectorState: () => mockConnectorState(),
}));
jest.mock('../../hooks/use-channels-connector', () => ({
  useChannelCustomUpdater: () => ({
    updateChannelCustom: mockUpdateChannelCustom,
    loading: false,
  }),
}));
jest.mock('../ui/option-select', () => ({
  __esModule: true,
  default: ({
    value,
    options,
    onChange,
  }: {
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
  }) => (
    <select
      aria-label="warehouse"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="" />
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

const price = { id: 'c1', key: 'price' };
const supply = { id: 'c2', key: 'supply' };

const state = (overrides: Record<string, unknown> = {}) => ({
  tiktokStore: { distributionChannels: [price], supplyChannels: [supply] },
  connection: {
    connected: true,
    warehouses: [{ id: 'w1', name: 'Main' }, { id: 'w2' }],
  },
  ...overrides,
});

// NimbusProvider renders a <script> (colour-mode bootstrap); React warns about it under jsdom.
beforeEach(() => {
  mockShowNotification.mockReset();
  mockUpdateChannelCustom.mockReset().mockResolvedValue({});
  mockConnectorState.mockReturnValue(state());
  const consoleError = console.error;
  jest.spyOn(console, 'error').mockImplementation((message, ...rest) => {
    if (typeof message === 'string' && message.includes('script tag')) return;
    consoleError(message, ...rest);
  });
});

const renderWizard = () =>
  renderApplicationWithRedux(
    <NimbusProvider loadFonts={false}>
      <WarehouseConfigWizard />
    </NimbusProvider>,
    { route: '/my-project/tiktok-connect', disableRoutePermissionCheck: true }
  );

const submit = () => screen.getByRole('button', { name: 'Submit' });

it('lists the TikTok warehouses and marks both channels with the chosen one', async () => {
  renderWizard();
  fireEvent.change(await screen.findByLabelText('warehouse'), {
    target: { value: 'w1' },
  });
  await waitFor(() => expect(submit().hasAttribute('disabled')).toBe(false));
  fireEvent.click(submit());

  await waitFor(() => expect(mockUpdateChannelCustom).toHaveBeenCalledTimes(2));
  expect(mockUpdateChannelCustom).toHaveBeenNthCalledWith(1, {
    channelId: 'c1',
    typeKey: 'tiktok-channel-type',
    fields: { isTikTokPrice: true, warehouseId: 'w1' },
  });
  expect(mockUpdateChannelCustom).toHaveBeenNthCalledWith(2, {
    channelId: 'c2',
    typeKey: 'tiktok-channel-type',
    fields: { isTikTokWarehouse: true, warehouseId: 'w1' },
  });
});

it('updates one channel once when it is both the price and the supply channel', async () => {
  mockConnectorState.mockReturnValue(
    state({
      tiktokStore: { distributionChannels: [price], supplyChannels: [price] },
    })
  );
  renderWizard();
  fireEvent.change(await screen.findByLabelText('warehouse'), {
    target: { value: 'w2' },
  });
  await waitFor(() => expect(submit().hasAttribute('disabled')).toBe(false));
  fireEvent.click(submit());

  await waitFor(() => expect(mockUpdateChannelCustom).toHaveBeenCalledTimes(1));
  expect(mockUpdateChannelCustom).toHaveBeenCalledWith({
    channelId: 'c1',
    typeKey: 'tiktok-channel-type',
    fields: { isTikTokPrice: true, warehouseId: 'w2', isTikTokWarehouse: true },
  });
});

it('asks for the ID from Seller Center when TikTok lists no warehouses', async () => {
  mockConnectorState.mockReturnValue(
    state({ connection: { connected: true, warehouses: [] } })
  );
  renderWizard();

  const input = await screen.findByRole('textbox');
  expect(
    screen.getByText(/Copy the warehouse ID from your TikTok Seller Center/)
  ).toBeTruthy();
  expect(submit().hasAttribute('disabled')).toBe(true);
  fireEvent.change(input, { target: { value: ' 7123 ' } });
  await waitFor(() => expect(submit().hasAttribute('disabled')).toBe(false));
  fireEvent.click(submit());

  await waitFor(() => expect(mockUpdateChannelCustom).toHaveBeenCalled());
  expect(mockUpdateChannelCustom.mock.calls[0][0].fields.warehouseId).toBe(
    '7123'
  );
});

it('says when the saved warehouse is not one of the shop warehouses', async () => {
  mockConnectorState.mockReturnValue(state({ warehouseId: 'dummy-1' }));
  renderWizard();

  await screen.findByText(/dummy-1/);
  expect(screen.getByText(/is not one of this shop/)).toBeTruthy();
});

it('shows the failure reason when a channel cannot be updated', async () => {
  mockUpdateChannelCustom.mockRejectedValue(new Error('Version mismatch'));
  renderWizard();
  fireEvent.change(await screen.findByLabelText('warehouse'), {
    target: { value: 'w1' },
  });
  await waitFor(() => expect(submit().hasAttribute('disabled')).toBe(false));
  fireEvent.click(submit());

  await waitFor(() => expect(mockShowNotification).toHaveBeenCalled());
  expect(mockShowNotification.mock.calls[0][0].text).toContain(
    'Version mismatch'
  );
});
