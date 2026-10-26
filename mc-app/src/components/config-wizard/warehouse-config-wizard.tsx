import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Stack,
  Text,
  TextInput,
} from '@commercetools/nimbus';
import { useConnectorState } from '../../contexts';
import { useChannelCustomUpdater } from '../../hooks/use-channels-connector';
import Field from '../ui/field';
import OptionSelect from '../ui/option-select';
import Page from '../ui/page';
import { useNotify } from './use-notify';

const CHANNEL_TYPE_KEY = 'tiktok-channel-type';

/**
 * Last step, once TikTok is authorized: the TikTok warehouse stock goes to.
 * It is saved on the store's channels, which are marked for TikTok here
 * because the channel type requires the warehouse ID.
 */
const WarehouseConfigWizard = () => {
  const notify = useNotify();
  const {
    tiktokStore,
    connection,
    warehouseId: savedWarehouseId,
  } = useConnectorState();
  const { updateChannelCustom, loading } = useChannelCustomUpdater();
  const [warehouseId, setWarehouseId] = useState('');

  const distributionChannel = tiktokStore?.distributionChannels?.[0];
  const supplyChannel = tiktokStore?.supplyChannels?.[0];
  const warehouses = connection?.warehouses ?? [];
  const chosenWarehouseId = warehouseId.trim();

  const handleSubmit = async () => {
    if (!chosenWarehouseId) {
      notify('error', 'Please choose a TikTok warehouse');
      return;
    }
    if (!distributionChannel || !supplyChannel) {
      notify(
        'error',
        'The store needs a distribution channel and an inventory supply channel. Add them to the store in the Merchant Center, then try again.'
      );
      return;
    }
    const sameChannel = distributionChannel.id === supplyChannel.id;
    try {
      await updateChannelCustom({
        channelId: distributionChannel.id,
        typeKey: CHANNEL_TYPE_KEY,
        fields: {
          isTikTokPrice: true,
          warehouseId: chosenWarehouseId,
          ...(sameChannel && { isTikTokWarehouse: true }),
        },
      });
      if (!sameChannel) {
        await updateChannelCustom({
          channelId: supplyChannel.id,
          typeKey: CHANNEL_TYPE_KEY,
          fields: { isTikTokWarehouse: true, warehouseId: chosenWarehouseId },
        });
      }
    } catch (error) {
      notify(
        'error',
        `Failed to connect your channels to the TikTok warehouse${
          error instanceof Error ? `: ${error.message}` : ''
        }`
      );
      return;
    }
    notify('success', 'TikTok warehouse connected successfully');
    setTimeout(() => window.location.reload(), 1500);
  };

  if (!distributionChannel || !supplyChannel) {
    return (
      <Text>
        The selected store has no distribution channel or supply channel.
      </Text>
    );
  }

  return (
    <Page
      title="Configuration Wizard"
      description="Step 3 of 3: choose the TikTok warehouse the connector pushes stock to."
    >
      {savedWarehouseId && warehouses.length > 0 && (
        <Alert.Root variant="outlined" colorPalette="warning">
          <Alert.Description>
            The warehouse ID saved on the supply channel ({savedWarehouseId}) is
            not one of this shop&apos;s TikTok warehouses. Choose the right one
            to replace it.
          </Alert.Description>
        </Alert.Root>
      )}
      <Card.Root variant="outlined-elevated">
        <Card.Body>
          <Stack direction="column" gap="300">
            {warehouses.length > 0 ? (
              <Field label="TikTok Warehouse" isRequired>
                <OptionSelect
                  name="tiktokWarehouseId"
                  value={warehouseId}
                  options={warehouses.map((warehouse) => ({
                    value: warehouse.id,
                    label: warehouse.name
                      ? `${warehouse.name} (${warehouse.id})`
                      : warehouse.id,
                  }))}
                  onChange={setWarehouseId}
                  placeholder="Select a warehouse"
                />
              </Field>
            ) : (
              <Field
                label="TikTok Warehouse ID"
                description="TikTok returned no warehouses for this shop. Copy the warehouse ID from your TikTok Seller Center (Settings, Warehouses) and paste it here."
                isRequired
              >
                <TextInput
                  name="tiktokWarehouseId"
                  aria-label="TikTok Warehouse ID"
                  value={warehouseId}
                  onChange={setWarehouseId}
                />
              </Field>
            )}
          </Stack>
        </Card.Body>
      </Card.Root>
      <div>
        <Button
          variant="solid"
          colorPalette="primary"
          onPress={() => void handleSubmit()}
          isDisabled={loading || !chosenWarehouseId}
        >
          Submit
        </Button>
      </div>
    </Page>
  );
};

WarehouseConfigWizard.displayName = 'WarehouseConfigWizard';

export default WarehouseConfigWizard;
