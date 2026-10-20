import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import type { ApolloError } from '@apollo/client';
import { useServiceUrlFetcher } from '../hooks/use-service-url';
import {
  useTikTokConfigFetcher,
  type TTikTokConfiguration,
} from '../hooks/use-tiktok-config';
import { useStoresFetcher } from '../hooks/use-stores-connector';
import { useChannelsFetcher } from '../hooks/use-channels-connector';
import { TChannel } from '../types/generated/ctp';

type ServiceUrlContextValue = {
  serviceUrl?: string;
  configuration?: TTikTokConfiguration;
  connectionNotInitialized: boolean;
  mcTiktokStore?: string;
  mcDistributionTiktokChannel?: TChannel;
  mcSupplyTiktokChannel?: TChannel;
  storedTiktokWarehouseId?: string;
  showConfigWizard: boolean;
  loading: boolean;
  error?: ApolloError;
};

const ServiceUrlContext = createContext<ServiceUrlContextValue | undefined>(
  undefined
);

type ServiceUrlProviderProps = {
  children: ReactNode;
};

export const ServiceUrlProvider = ({ children }: ServiceUrlProviderProps) => {
  const {
    serviceUrl,
    loading: serviceUrlLoading,
    error: serviceUrlError,
  } = useServiceUrlFetcher();
  const { configuration, loading: configLoading } = useTikTokConfigFetcher();
  const { stores, loading: storesLoading } = useStoresFetcher();
  const { channels, loading: channelsLoading } = useChannelsFetcher();

  const [connectionNotInitialized, setConnectionNotInitialized] =
    useState(false);
  const [mcTiktokStore, setMcTiktokStore] = useState<string | undefined>();
  const [mcDistributionTiktokChannel, setMcDistributionTiktokChannel] =
    useState<TChannel | undefined>();
  const [mcSupplyTiktokChannel, setMcSupplyTiktokChannel] = useState<
    TChannel | undefined
  >();
  const [storedTiktokWarehouseId, setStoredTiktokWarehouseId] = useState<
    string | undefined
  >();
  const [showConfigWizard, setShowConfigWizard] = useState(false);

  // Helper function to get custom field value
  const getCustomFieldValue = (
    customFieldsRaw: { name: string; value: string }[] | undefined,
    fieldName: string
  ): string | undefined => {
    if (!customFieldsRaw) return undefined;
    const field = customFieldsRaw.find((f) => f.name === fieldName);
    if (!field) return undefined;
    try {
      // Values are stored as JSON strings, try to parse as boolean
      return JSON.parse(field.value);
    } catch {
      return field.value;
    }
  };

  useEffect(() => {
    // Check if configuration is not initialized
    if (
      !configuration ||
      !configuration.ctSupplyChannelId ||
      !configuration.ctDistributionChannelId ||
      !configuration.ctStoreId ||
      !configuration.ctStoreKey
    ) {
      setConnectionNotInitialized(true);
    } else {
      setConnectionNotInitialized(false);
    }

    // Find TikTok store
    if (stores && stores.length > 0) {
      const tiktokStore = stores.find((store) => {
        const isTikTokStore = !!getCustomFieldValue(
          store.custom?.customFieldsRaw,
          'isTikTokShop'
        );
        return isTikTokStore === true;
      });

      if (tiktokStore) {
        setMcTiktokStore(tiktokStore.id);

        // Find TikTok channels from the store's channels
        if (channels && channels.length > 0) {
          // Find distribution channel
          const distributionChannelId =
            tiktokStore.distributionChannels?.[0]?.id;
          if (distributionChannelId) {
            const distributionChannel = channels.find((channel) => {
              if (channel.id !== distributionChannelId) return false;
              const isTikTokChannel = !!getCustomFieldValue(
                channel.custom?.customFieldsRaw,
                'isTikTokPrice'
              );
              return isTikTokChannel === true;
            });
            if (distributionChannel) {
              setMcDistributionTiktokChannel(distributionChannel as TChannel);
            }
          }

          // Find supply channel
          const supplyChannelId = tiktokStore.supplyChannels?.[0]?.id;
          if (supplyChannelId) {
            const supplyChannel = channels.find((channel) => {
              if (channel.id !== supplyChannelId) return false;
              const isTikTokChannel = !!getCustomFieldValue(
                channel.custom?.customFieldsRaw,
                'isTikTokWarehouse'
              );
              return isTikTokChannel === true;
            });
            if (supplyChannel) {
              setMcSupplyTiktokChannel(supplyChannel as TChannel);
              const warehouseId = supplyChannel.custom?.customFieldsRaw?.find(
                (field) => field.name === 'warehouseId'
              )?.value;
              if (warehouseId) {
                setStoredTiktokWarehouseId(warehouseId);
              }
            }
          }
        }
      }
    }

    // Determine if config wizard should be shown
    setShowConfigWizard(
      !mcTiktokStore ||
        !mcDistributionTiktokChannel ||
        !mcSupplyTiktokChannel ||
        !configuration?.isInitialized ||
        !storedTiktokWarehouseId
    );
  }, [
    configuration,
    stores,
    channels,
    mcTiktokStore,
    mcDistributionTiktokChannel,
    mcSupplyTiktokChannel,
  ]);

  const loading =
    serviceUrlLoading || configLoading || storesLoading || channelsLoading;

  return (
    <ServiceUrlContext.Provider
      value={{
        serviceUrl,
        configuration,
        connectionNotInitialized,
        mcTiktokStore,
        mcDistributionTiktokChannel,
        mcSupplyTiktokChannel,
        storedTiktokWarehouseId,
        showConfigWizard,
        loading,
        error: serviceUrlError,
      }}
    >
      {children}
    </ServiceUrlContext.Provider>
  );
};

export const useServiceUrl = (): ServiceUrlContextValue => {
  const context = useContext(ServiceUrlContext);
  if (context === undefined) {
    throw new Error('useServiceUrl must be used within a ServiceUrlProvider');
  }
  return context;
};
