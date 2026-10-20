import { useState, useMemo } from 'react';
import { useApplicationContext } from '@commercetools-frontend/application-shell-connectors';
import Constraints from '@commercetools-uikit/constraints';
import Spacings from '@commercetools-uikit/spacings';
import Text from '@commercetools-uikit/text';
import SelectField from '@commercetools-uikit/select-field';
import Card from '@commercetools-uikit/card';
import PrimaryButton from '@commercetools-uikit/primary-button';
import LoadingSpinner from '@commercetools-uikit/loading-spinner';
import { useServiceUrl } from '../../contexts';
import {
  useStoresFetcher,
  useStoreCustomUpdater,
} from '../../hooks/use-stores-connector';
import {
  useChannelsFetcher,
  useChannelCustomUpdater,
} from '../../hooks/use-channels-connector';
import { useShowNotification } from '@commercetools-frontend/actions-global';
import {
  DOMAINS,
  NOTIFICATION_KINDS_SIDE,
} from '@commercetools-frontend/constants';

const StoreConfigWizard = () => {
  const showNotification = useShowNotification();
  const { dataLocale } = useApplicationContext((context) => ({
    dataLocale: context.dataLocale,
  }));
  const { mcTiktokStore } = useServiceUrl();
  const { stores, loading: storesLoading } = useStoresFetcher();
  const { channels, loading: channelsLoading } = useChannelsFetcher();
  const { updateStoreCustom, loading: storeUpdateLoading } =
    useStoreCustomUpdater();
  const { updateChannelCustom, loading: channelUpdateLoading } =
    useChannelCustomUpdater();

  const [selectedStoreId, setSelectedStoreId] = useState<string>(
    mcTiktokStore || ''
  );
  // const [error, setError] = useState<string>('');
  // const [success, setSuccess] = useState<boolean>(false);

  // Check if the selection has changed from the original

  // Create options for select field
  const storeOptions = useMemo(() => {
    if (!stores) return [];
    return stores.map((store) => {
      // Get the localized name
      let label = store.key;
      if (store.nameAllLocales && store.nameAllLocales.length > 0) {
        const localizedName = store.nameAllLocales.find(
          (name) => name.locale === dataLocale
        );
        if (localizedName) {
          label = localizedName.value;
        } else {
          // Fallback to first available locale
          label = store.nameAllLocales[0].value;
        }
      }
      return {
        value: store.id,
        label,
      };
    });
  }, [stores, dataLocale]);

  // Get selected store details
  const selectedStore = useMemo(() => {
    if (!selectedStoreId || !stores) return null;
    return stores.find((store) => store.id === selectedStoreId);
  }, [selectedStoreId, stores]);

  const handleSubmit = async () => {
    if (!selectedStoreId || !selectedStore) {
      showNotification({
        kind: NOTIFICATION_KINDS_SIDE.error,
        domain: DOMAINS.SIDE,
        text: 'Please select a store',
      });
      return;
    }

    try {
      // Update store custom field
      await updateStoreCustom({
        storeId: selectedStoreId,
        typeKey: 'tiktok-store-type',
        fields: {
          isTikTokShop: true,
        },
      });

      // Update channels
      const distributionChannelId = selectedStore.distributionChannels?.[0]?.id;
      const supplyChannelId = selectedStore.supplyChannels?.[0]?.id;

      if (distributionChannelId) {
        await updateChannelCustom({
          channelId: distributionChannelId,
          typeKey: 'tiktok-channel-type',
          fields: {
            isTikTokPrice: true,
            ...(supplyChannelId === distributionChannelId && {
              isTikTokWarehouse: true,
            }),
          },
        });
      }

      if (supplyChannelId && supplyChannelId !== distributionChannelId) {
        await updateChannelCustom({
          channelId: supplyChannelId,
          typeKey: 'tiktok-channel-type',
          fields: {
            isTikTokWarehouse: true,
          },
        });
      }

      showNotification({
        kind: NOTIFICATION_KINDS_SIDE.success,
        domain: DOMAINS.SIDE,
        text: 'Configuration updated successfully! Reloading...',
      });
      // Reload the page after a short delay to reflect changes
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      showNotification({
        kind: NOTIFICATION_KINDS_SIDE.error,
        domain: DOMAINS.SIDE,
        text:
          err instanceof Error ? err.message : 'Failed to update configuration',
      });
    }
  };

  const isSubmitting = storeUpdateLoading || channelUpdateLoading;

  if (storesLoading || channelsLoading) {
    return (
      <Constraints.Horizontal max={16}>
        <Spacings.Stack scale="xl">
          <LoadingSpinner />
        </Spacings.Stack>
      </Constraints.Horizontal>
    );
  }

  return (
    <Constraints.Horizontal max={16}>
      <Spacings.Stack scale="xl">
        <Text.Headline as="h1">Configuration Wizard</Text.Headline>
        <Text.Body>
          Configure your TikTok integration by selecting a store and its
          channels.
        </Text.Body>

        <Card theme="light" type="raised">
          <Spacings.Stack scale="m">
            <SelectField
              title="Select Store"
              name="store"
              value={selectedStoreId}
              options={storeOptions}
              onChange={(event) => {
                setSelectedStoreId((event.target.value as string) || '');
              }}
              isRequired
              isDisabled={isSubmitting}
            />

            {selectedStore && (
              <Spacings.Stack scale="m">
                <Text.Subheadline as="h4">Channels</Text.Subheadline>

                {selectedStore.distributionChannels &&
                selectedStore.distributionChannels.length > 0 ? (
                  <Card theme="light" type="flat">
                    <Spacings.Stack scale="s">
                      <Text.Body fontWeight="bold">
                        Distribution Channel
                      </Text.Body>
                      <Text.Body>
                        Key: {selectedStore.distributionChannels[0].key}
                      </Text.Body>
                      <Text.Detail tone="secondary">
                        ID: {selectedStore.distributionChannels[0].id}
                      </Text.Detail>
                    </Spacings.Stack>
                  </Card>
                ) : (
                  <Card theme="light" type="flat">
                    <Text.Body tone="critical">
                      No distribution channel found for this store
                    </Text.Body>
                  </Card>
                )}

                {selectedStore.supplyChannels &&
                selectedStore.supplyChannels.length > 0 ? (
                  <Card theme="light" type="flat">
                    <Spacings.Stack scale="s">
                      <Text.Body fontWeight="bold">Supply Channel</Text.Body>
                      <Text.Body>
                        Key: {selectedStore.supplyChannels[0].key}
                      </Text.Body>
                      <Text.Detail tone="secondary">
                        ID: {selectedStore.supplyChannels[0].id}
                      </Text.Detail>
                    </Spacings.Stack>
                  </Card>
                ) : (
                  <Card theme="light" type="flat">
                    <Text.Body tone="critical">
                      No supply channel found for this store
                    </Text.Body>
                  </Card>
                )}
              </Spacings.Stack>
            )}
          </Spacings.Stack>
        </Card>

        <Spacings.Inline scale="m">
          <PrimaryButton
            label="Submit"
            onClick={handleSubmit}
            isDisabled={isSubmitting || !selectedStoreId}
            iconRight={isSubmitting ? <LoadingSpinner /> : undefined}
          />
        </Spacings.Inline>
      </Spacings.Stack>
    </Constraints.Horizontal>
  );
};

StoreConfigWizard.displayName = 'StoreConfigWizard';

export default StoreConfigWizard;
