import React, { useState } from 'react';
import { useServiceUrl } from '../../contexts';
import { useApplicationContext } from '@commercetools-frontend/application-shell-connectors';
import { useShowNotification } from '@commercetools-frontend/actions-global';
import { useStoresFetcher } from '../../hooks/use-stores-connector';
import { useChannelByIdFetcher, useChannelsFetcher } from '../../hooks/use-channels-connector';
import { useStoreCustomUpdater } from '../../hooks/use-stores-connector';
import { useChannelCustomUpdater } from '../../hooks/use-channels-connector';
import Spacings from '@commercetools-uikit/spacings';
import Constraints from '@commercetools-uikit/constraints';
import Text from '@commercetools-uikit/text';
import Card from '@commercetools-uikit/card';
import TextField from '@commercetools-uikit/text-field';
import LoadingSpinner from '@commercetools-uikit/loading-spinner';
import PrimaryButton from '@commercetools-uikit/primary-button';
import { DOMAINS, NOTIFICATION_KINDS_SIDE } from '@commercetools-frontend/constants';


const WarehouseConfigWizard = () => {
  const showNotification = useShowNotification();
  const { dataLocale } = useApplicationContext((context) => ({
    dataLocale: context.dataLocale,
  }));
  const { mcSupplyTiktokChannel } = useServiceUrl();
  const { updateChannelCustom, loading: channelUpdateLoading } =
    useChannelCustomUpdater();
  const [tiktokWarehouseId, setTiktokWarehouseId] = useState<string>('');

  const handleSubmit = async () => {
    if (!tiktokWarehouseId || !mcSupplyTiktokChannel) {
      showNotification({
        kind: NOTIFICATION_KINDS_SIDE.error,
        domain: DOMAINS.SIDE,
        text: 'Please enter a TikTok warehouse ID',
      });
      return;
    }
    try {
      await updateChannelCustom({
        channelId: mcSupplyTiktokChannel.id,
        typeKey: 'tiktok-channel-type',
        fields: {
          ...(mcSupplyTiktokChannel.custom?.customFieldsRaw?.reduce((acc: Record<string, any>, curr) => {
            acc[curr.name] = curr.value;
            return acc;
          }, {})),
          warehouseId: `"${tiktokWarehouseId}"`,
        },
      });
    } catch (error) {
      showNotification({
        kind: NOTIFICATION_KINDS_SIDE.error,
        domain: DOMAINS.SIDE,
        text: 'Failed to connect your Inventory supply channel to your TikTok warehouse',
      });
      return;
    }
    showNotification({
      kind: NOTIFICATION_KINDS_SIDE.success,
      domain: DOMAINS.SIDE,
      text: 'Inventory supply channel connected to TikTok warehouse successfully',
    });
  };

if (!mcSupplyTiktokChannel) {
  return <div>Supply channel not found</div>;
}

  return (
    <Constraints.Horizontal max={16}>
      <Spacings.Stack scale="xl">
        <Text.Headline as="h1">Configuration Wizard</Text.Headline>
        <Text.Body>
          Connect your Inventory supply channel to your TikTok warehouse.
        </Text.Body>

        <Card theme="light" type="raised">
          <Spacings.Stack scale="m">
            <TextField
              title="TikTok Warehouse ID"
              name="tiktokWarehouseId"
              value={tiktokWarehouseId}
              onChange={(event) => setTiktokWarehouseId(event.target.value)}
              isRequired
            />
          </Spacings.Stack>
        </Card>

        <Spacings.Inline scale="m">
          <PrimaryButton
            label="Submit"
            onClick={handleSubmit}
            isDisabled={channelUpdateLoading || !tiktokWarehouseId}
            iconRight={channelUpdateLoading ? <LoadingSpinner /> : undefined}
          />
        </Spacings.Inline>
      </Spacings.Stack>
    </Constraints.Horizontal>
  );
};

export default WarehouseConfigWizard;
