import { render, screen } from '@testing-library/react';
import { ConnectorStateProvider, useConnectorState } from './connector-state';

let mockWarehouseId: string | undefined;
let mockWarehouses: { id: string }[] = [];
let mockConnected = true;

const channel = (id: string, flag: string) => ({
  id,
  custom: {
    type: { id: 't', key: 'tiktok-channel-type' },
    customFieldsRaw: [
      { name: flag, value: true },
      ...(mockWarehouseId
        ? [{ name: 'warehouseId', value: mockWarehouseId }]
        : []),
    ],
  },
});

jest.mock('../hooks/use-stores-connector', () => ({
  useStoresFetcher: () => ({
    loading: false,
    stores: [
      {
        id: 's1',
        custom: {
          type: { id: 't', key: 'tiktok-store-type' },
          customFieldsRaw: [{ name: 'isTikTokShop', value: true }],
        },
        distributionChannels: [{ id: 'c1' }],
        supplyChannels: [{ id: 'c2' }],
      },
    ],
  }),
}));
jest.mock('../hooks/use-channels-connector', () => ({
  useChannelsFetcher: () => ({
    loading: false,
    channels: [
      channel('c1', 'isTikTokPrice'),
      channel('c2', 'isTikTokWarehouse'),
    ],
  }),
}));
jest.mock('../hooks/use-connection-status', () => ({
  useConnectionStatus: () => ({
    loading: false,
    refetch: jest.fn(),
    status: { connected: mockConnected, warehouses: mockWarehouses },
  }),
}));

const Probe = () => (
  <span>{useConnectorState().showConfigWizard ? 'wizard' : 'done'}</span>
);

const renderState = () =>
  render(
    <ConnectorStateProvider>
      <Probe />
    </ConnectorStateProvider>
  );

beforeEach(() => {
  mockWarehouseId = 'w1';
  mockWarehouses = [{ id: 'w1' }, { id: 'w2' }];
  mockConnected = true;
});

it('is done when the saved warehouse is one of the shop warehouses', () => {
  renderState();
  expect(screen.getByText('done')).toBeTruthy();
});

it('is done for a numeric TikTok warehouse ID, which must stay a string', () => {
  mockWarehouseId = '7123456789012345678';
  mockWarehouses = [{ id: '7123456789012345678' }];
  renderState();
  expect(screen.getByText('done')).toBeTruthy();
});

it('keeps the wizard open when the saved warehouse is not one of them', () => {
  mockWarehouseId = 'dummy-1';
  renderState();
  expect(screen.getByText('wizard')).toBeTruthy();
});

it('trusts the saved warehouse while TikTok lists none', () => {
  mockWarehouseId = 'dummy-1';
  mockWarehouses = [];
  renderState();
  expect(screen.getByText('done')).toBeTruthy();
});

it('keeps the wizard open without a saved warehouse or without a connection', () => {
  mockWarehouseId = undefined;
  renderState();
  expect(screen.getByText('wizard')).toBeTruthy();
});

it('keeps the wizard open while TikTok is not connected', () => {
  mockConnected = false;
  renderState();
  expect(screen.getByText('wizard')).toBeTruthy();
});
