import { NimbusProvider } from '@commercetools/nimbus';
import {
  fireEvent,
  screen,
  waitFor,
} from '@commercetools-frontend/application-shell/test-utils';
import { renderApplicationWithRedux } from '../../test-utils';
import NewStoreForm from './new-store-form';

const mockShowNotification = jest.fn();
const mockCreate = jest.fn();
let mockChannels: unknown[] = [];
let mockSelections: unknown[] = [];

jest.mock('@commercetools-frontend/actions-global', () => ({
  useShowNotification: () => mockShowNotification,
}));
jest.mock('../../hooks/use-channels-connector', () => ({
  useChannelsFetcher: () => ({ channels: mockChannels, loading: false }),
}));
jest.mock('../../hooks/use-store-setup', () => ({
  ...jest.requireActual('../../hooks/use-store-setup/keys'),
  PRICE_ROLE: 'ProductDistribution',
  INVENTORY_ROLE: 'InventorySupply',
  useProductSelectionsFetcher: () => ({
    productSelections: mockSelections,
    loading: false,
  }),
  useStoreCreator: () => ({ createTikTokStore: mockCreate, loading: false }),
}));
jest.mock('../ui/option-select', () => ({
  __esModule: true,
  default: (props: {
    value: string;
    name: string;
    id?: string;
    isDisabled?: boolean;
    'aria-label'?: string;
    'aria-labelledby'?: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
  }) => (
    <select
      id={props.id}
      name={props.name}
      aria-label={props['aria-label'] ?? props.name}
      aria-labelledby={props['aria-labelledby']}
      value={props.value}
      disabled={props.isDisabled}
      onChange={(event) => props.onChange(event.target.value)}
    >
      <option value="" />
      {props.options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

const channel = (id: string, roles: string[]) => ({
  id,
  key: `key-${id}`,
  roles,
  nameAllLocales: [{ locale: 'en', value: `Channel ${id}` }],
});

// NimbusProvider renders a <script> (colour-mode bootstrap); React warns about it under jsdom.
beforeEach(() => {
  // The form reloads the page 1.5 s after success; jsdom can not reload.
  jest.useFakeTimers();
  mockShowNotification.mockReset();
  mockCreate.mockReset().mockResolvedValue({ id: 'store-1' });
  mockChannels = [];
  mockSelections = [];
  const consoleError = console.error;
  jest.spyOn(console, 'error').mockImplementation((message, ...rest) => {
    if (typeof message === 'string' && message.includes('script tag')) return;
    consoleError(message, ...rest);
  });
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

const renderForm = () =>
  renderApplicationWithRedux(
    <NimbusProvider loadFonts={false}>
      <NewStoreForm />
    </NimbusProvider>,
    { route: '/my-project/tiktok-connect', disableRoutePermissionCheck: true }
  );

const field = (label: string) => new RegExp(`^${label}`);

const submit = () =>
  screen.getByRole('button', { name: 'Create store and continue' });
const isDisabled = (element: HTMLElement) => element.hasAttribute('disabled');

it('never asks for a warehouse', async () => {
  renderForm();
  await screen.findByLabelText(field('Store name'));
  expect(screen.queryByText(/warehouse/i)).toBeNull();
});

it('is ready to create everything new with sensible names and keys', async () => {
  renderForm();
  await screen.findByLabelText(field('Store name'));
  await waitFor(() => expect(isDisabled(submit())).toBe(false));
  fireEvent.click(submit());

  await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
  expect(mockCreate.mock.calls[0][0]).toEqual({
    locale: expect.any(String),
    store: { name: 'TikTok Store', key: 'tiktok-store' },
    productSelection: {
      mode: 'new',
      name: 'TikTok Products',
      key: 'tiktok-products',
    },
    channels: {
      shared: true,
      channel: { mode: 'new', name: 'TikTok Channel', key: 'tiktok-channel' },
    },
  });
  await waitFor(() => expect(mockShowNotification).toHaveBeenCalled());
  expect(mockShowNotification.mock.calls[0][0].text).toContain('Store created');
});

it('creates the store without a product selection when the box is unticked', async () => {
  renderForm();
  await screen.findByLabelText(field('Store name'));
  fireEvent.click(
    screen.getByLabelText('Add a product selection to the store')
  );
  await waitFor(() => expect(isDisabled(submit())).toBe(false));
  fireEvent.click(submit());

  await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
  expect(mockCreate.mock.calls[0][0]).not.toHaveProperty('productSelection');
});

it('derives the key from the name until the key is edited', async () => {
  renderForm();
  const name = await screen.findByLabelText(field('Store name'));
  const key = screen.getByLabelText(field('Store key')) as HTMLInputElement;

  fireEvent.change(name, { target: { value: 'My EU Shop' } });
  expect(key.value).toBe('my-eu-shop');

  fireEvent.change(key, { target: { value: 'eu' } });
  fireEvent.change(name, { target: { value: 'Another' } });
  expect(key.value).toBe('eu');
});

it('does not allow submitting an invalid key', async () => {
  renderForm();
  fireEvent.change(await screen.findByLabelText(field('Store key')), {
    target: { value: 'not valid!' },
  });
  await waitFor(() => expect(isDisabled(submit())).toBe(true));
});

it('uses existing product selections and channels when the project has them', async () => {
  mockSelections = [
    {
      id: 'sel-1',
      key: 'main',
      nameAllLocales: [{ locale: 'en', value: 'Main' }],
    },
  ];
  mockChannels = [
    channel('both', ['ProductDistribution', 'InventorySupply']),
    channel('price-only', ['ProductDistribution']),
  ];
  renderForm();

  await screen.findByLabelText(field('Select product selection'));
  expect(isDisabled(submit())).toBe(true);
  fireEvent.change(screen.getByLabelText(field('Select product selection')), {
    target: { value: 'sel-1' },
  });
  const shared = screen.getByLabelText(field('Select channel'));
  expect(shared.querySelectorAll('option[value="price-only"]')).toHaveLength(0);
  fireEvent.change(shared, { target: { value: 'both' } });

  await waitFor(() => expect(isDisabled(submit())).toBe(false));
  fireEvent.click(submit());

  await waitFor(() => expect(mockCreate).toHaveBeenCalled());
  expect(mockCreate.mock.calls[0][0]).toMatchObject({
    productSelection: { mode: 'existing', id: 'sel-1' },
    channels: { shared: true, channel: { mode: 'existing', id: 'both' } },
  });
});

it('asks for a price and an inventory channel when they are not one', async () => {
  mockChannels = [
    channel('price', ['ProductDistribution']),
    channel('stock', ['InventorySupply']),
  ];
  renderForm();
  fireEvent.click(
    await screen.findByRole('checkbox', {
      name: 'Use one channel for both price and inventory',
    })
  );

  const price = await screen.findByLabelText(field('Select price channel'));
  const stock = screen.getByLabelText(field('Select inventory channel'));
  expect(price.querySelectorAll('option[value="stock"]')).toHaveLength(0);
  expect(stock.querySelectorAll('option[value="price"]')).toHaveLength(0);
  fireEvent.change(price, { target: { value: 'price' } });
  fireEvent.change(stock, { target: { value: 'stock' } });
  await waitFor(() => expect(isDisabled(submit())).toBe(false));
  fireEvent.click(submit());

  await waitFor(() => expect(mockCreate).toHaveBeenCalled());
  expect(mockCreate.mock.calls[0][0].channels).toEqual({
    shared: false,
    price: { mode: 'existing', id: 'price' },
    inventory: { mode: 'existing', id: 'stock' },
  });
});

it('refuses two new channels with the same key', async () => {
  renderForm();
  fireEvent.click(
    await screen.findByRole('checkbox', {
      name: 'Use one channel for both price and inventory',
    })
  );

  const names = await screen.findAllByLabelText(field('Key of the new'));
  const priceKey = screen.getByLabelText(field('Key of the new price channel'));
  const stockKey = screen.getByLabelText(
    field('Key of the new inventory channel')
  );
  expect(names.length).toBeGreaterThan(1);
  fireEvent.change(priceKey, { target: { value: 'same' } });
  fireEvent.change(stockKey, { target: { value: 'same' } });

  await screen.findByText('The two new channels need different keys.');
  expect(isDisabled(submit())).toBe(true);
});

it('shows why it failed, and reuses what was created when retried', async () => {
  mockCreate.mockRejectedValueOnce(new Error('A duplicate value for key'));
  renderForm();
  await screen.findByLabelText(field('Store name'));
  await waitFor(() => expect(isDisabled(submit())).toBe(false));

  fireEvent.click(submit());
  await waitFor(() => expect(mockShowNotification).toHaveBeenCalled());
  expect(mockShowNotification.mock.calls[0][0].text).toBe(
    'The store could not be created: A duplicate value for key'
  );

  fireEvent.click(submit());
  await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(2));
  expect(mockCreate.mock.calls[1][1]).toBe(mockCreate.mock.calls[0][1]);
});
