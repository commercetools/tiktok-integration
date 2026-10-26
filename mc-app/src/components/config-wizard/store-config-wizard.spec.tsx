import { NimbusProvider } from '@commercetools/nimbus';
import {
  fireEvent,
  screen,
  waitFor,
} from '@commercetools-frontend/application-shell/test-utils';
import { renderApplicationWithRedux } from '../../test-utils';
import StoreConfigWizard from './store-config-wizard';

const mockShowNotification = jest.fn();
const mockUpdateStoreCustom = jest.fn();
let mockStores: unknown[] = [];

jest.mock('@commercetools-frontend/actions-global', () => ({
  useShowNotification: () => mockShowNotification,
}));
jest.mock('../../hooks/use-stores-connector', () => ({
  useStoresFetcher: () => ({ stores: mockStores, loading: false }),
  useStoreCustomUpdater: () => ({
    updateStoreCustom: mockUpdateStoreCustom,
    loading: false,
  }),
}));
jest.mock('./new-store-form', () => () => <div>new store form</div>);
jest.mock('../ui/option-select', () => ({
  __esModule: true,
  default: ({
    value,
    options,
    onChange,
    name,
    ...rest
  }: {
    value: string;
    name: string;
    'aria-label'?: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
  }) => (
    <select
      aria-label={rest['aria-label'] ?? name}
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

const channel = { id: 'c1', key: 'tiktok-channel' };

// NimbusProvider renders a <script> (colour-mode bootstrap); React warns about it under jsdom.
beforeEach(() => {
  mockShowNotification.mockReset();
  mockUpdateStoreCustom.mockReset().mockResolvedValue({});
  mockStores = [
    {
      id: 's1',
      key: 'tiktok-store',
      nameAllLocales: [],
      distributionChannels: [channel],
      supplyChannels: [channel],
    },
  ];
  const consoleError = console.error;
  jest.spyOn(console, 'error').mockImplementation((message, ...rest) => {
    if (typeof message === 'string' && message.includes('script tag')) return;
    consoleError(message, ...rest);
  });
});

const renderWizard = () =>
  renderApplicationWithRedux(
    <NimbusProvider loadFonts={false}>
      <StoreConfigWizard />
    </NimbusProvider>,
    { route: '/my-project/tiktok-connect', disableRoutePermissionCheck: true }
  );

const selectStore = async () =>
  fireEvent.change(await screen.findByLabelText('store'), {
    target: { value: 's1' },
  });

const submit = () => screen.getByRole('button', { name: 'Continue' });

it('does not ask for a warehouse before TikTok is authorized', async () => {
  renderWizard();
  await selectStore();

  expect(screen.queryByRole('textbox')).toBeNull();
  expect(screen.queryByText(/Warehouse ID/)).toBeNull();
});

it('only marks the store; channels and warehouse are left to the last step', async () => {
  renderWizard();
  await selectStore();
  fireEvent.click(submit());

  await waitFor(() => expect(mockUpdateStoreCustom).toHaveBeenCalled());
  expect(mockUpdateStoreCustom).toHaveBeenCalledWith({
    storeId: 's1',
    typeKey: 'tiktok-store-type',
    fields: { isTikTokShop: true },
  });
});

it('refuses a store without a supply channel and says why', async () => {
  mockStores = [
    {
      id: 's1',
      key: 'tiktok-store',
      nameAllLocales: [],
      distributionChannels: [channel],
      supplyChannels: [],
    },
  ];
  renderWizard();
  await selectStore();
  fireEvent.click(submit());

  await waitFor(() => expect(mockShowNotification).toHaveBeenCalled());
  expect(mockShowNotification.mock.calls[0][0].text).toContain(
    'needs a distribution channel and an inventory supply channel'
  );
  expect(mockUpdateStoreCustom).not.toHaveBeenCalled();
});

it('offers to create a store when the project has none', async () => {
  mockStores = [];
  renderWizard();

  await screen.findByText('new store form');
  expect(screen.queryByLabelText('store')).toBeNull();
});

it('switches to the form for a new store', async () => {
  renderWizard();
  await screen.findByLabelText('store');

  fireEvent.click(screen.getByRole('radio', { name: 'Create a new store' }));

  await screen.findByText('new store form');
  expect(screen.queryByLabelText('store')).toBeNull();
});
