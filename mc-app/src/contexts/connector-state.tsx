import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { ApolloError } from '@apollo/client';
import { useStoresFetcher } from '../hooks/use-stores-connector';
import { useChannelsFetcher } from '../hooks/use-channels-connector';
import { readCustomField } from '../hooks/custom-fields';
import { useConnectionStatus } from '../hooks/use-connection-status';
import type { ConnectionStatus } from '../hooks/use-tiktok-service';

type Store = NonNullable<ReturnType<typeof useStoresFetcher>['stores']>[number];
type Channel = NonNullable<
  ReturnType<typeof useChannelsFetcher>['channels']
>[number];

type ConnectorState = {
  tiktokStore?: Store;
  distributionChannel?: Channel;
  supplyChannel?: Channel;
  /** The TikTok warehouse the supply channel is connected to. */
  warehouseId?: string;
  connection?: ConnectionStatus;
  refreshConnection: () => Promise<void>;
  showConfigWizard: boolean;
  loading: boolean;
  error?: ApolloError | Error;
  /** True when the state needed to pick a screen is unknown (the first read failed), so no setup screen may be shown. */
  stateUnknown: boolean;
};

const ConnectorStateContext = createContext<ConnectorState | undefined>(
  undefined
);

/**
 * Where the setup stands: the store and channels flagged for TikTok (read from
 * the platform), and the connection to TikTok (read from the service).
 */
export const ConnectorStateProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const {
    stores,
    loading: storesLoading,
    error: storesError,
  } = useStoresFetcher();
  const {
    channels,
    loading: channelsLoading,
    error: channelsError,
  } = useChannelsFetcher();
  const {
    status: connection,
    loading: connectionLoading,
    error: connectionError,
    refetch,
  } = useConnectionStatus();

  const state = useMemo(() => {
    const tiktokStore = stores?.find(
      (store) => readCustomField(store, 'isTikTokShop') === true
    );
    const findChannel = (id: string | undefined, flag: string) =>
      channels?.find(
        (channel) =>
          channel.id === id && readCustomField(channel, flag) === true
      );
    const distributionChannel = findChannel(
      tiktokStore?.distributionChannels?.[0]?.id,
      'isTikTokPrice'
    );
    const supplyChannel = findChannel(
      tiktokStore?.supplyChannels?.[0]?.id,
      'isTikTokWarehouse'
    );
    const warehouse = readCustomField(supplyChannel, 'warehouseId');
    return {
      tiktokStore,
      distributionChannel,
      supplyChannel,
      warehouseId:
        typeof warehouse === 'string' && warehouse ? warehouse : undefined,
    };
  }, [stores, channels]);

  // Once TikTok lists the shop's warehouses, a saved ID outside that list (a typo or a placeholder) must be replaced.
  const warehouses = connection?.warehouses ?? [];
  const warehouseUsable =
    Boolean(state.warehouseId) &&
    (warehouses.length === 0 ||
      warehouses.some((warehouse) => warehouse.id === state.warehouseId));

  const value: ConnectorState = {
    ...state,
    connection,
    refreshConnection: refetch,
    showConfigWizard:
      !state.tiktokStore ||
      !state.distributionChannel ||
      !state.supplyChannel ||
      !connection?.connected ||
      !warehouseUsable,
    // Only the first load: a refresh must not replace the screen with a spinner.
    loading:
      storesLoading ||
      channelsLoading ||
      (connectionLoading && !connection && !connectionError),
    error: storesError ?? channelsError ?? connectionError,
    // A failed refresh after a good read keeps the last known state.
    stateUnknown: Boolean(
      storesError || channelsError || (connectionError && !connection)
    ),
  };

  return (
    <ConnectorStateContext.Provider value={value}>
      {children}
    </ConnectorStateContext.Provider>
  );
};

export const useConnectorState = (): ConnectorState => {
  const context = useContext(ConnectorStateContext);
  if (context === undefined) {
    throw new Error(
      'useConnectorState must be used within a ConnectorStateProvider'
    );
  }
  return context;
};
