import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  LoadingSpinner,
  RadioInput,
  Stack,
  Text,
} from '@commercetools/nimbus';
import { useApplicationContext } from '@commercetools-frontend/application-shell-connectors';
import {
  useStoresFetcher,
  useStoreCustomUpdater,
} from '../../hooks/use-stores-connector';
import Field from '../ui/field';
import OptionSelect from '../ui/option-select';
import Page from '../ui/page';
import NewStoreForm from './new-store-form';
import { useNotify } from './use-notify';

type ChannelRef = { id: string; key: string };

const ChannelSummary = ({
  title,
  channel,
}: {
  title: string;
  channel?: ChannelRef;
}) => (
  <Card.Root variant="outlined-muted">
    <Card.Body>
      <Stack direction="column" gap="100">
        <Text fontWeight="600">{title}</Text>
        {channel ? (
          <>
            <Text>Key: {channel.key}</Text>
            <Text textStyle="sm" color="neutral.11">
              ID: {channel.id}
            </Text>
          </>
        ) : (
          <Text color="critical.11">
            No {title.toLowerCase()} found for this store
          </Text>
        )}
      </Stack>
    </Card.Body>
  </Card.Root>
);

/** Marks one of the project's stores for TikTok. Its channels are used as they are. */
const ExistingStoreForm = () => {
  const notify = useNotify();
  const dataLocale = useApplicationContext((context) => context.dataLocale);
  const { stores } = useStoresFetcher();
  const { updateStoreCustom, loading: isSubmitting } = useStoreCustomUpdater();
  const [selectedStoreId, setSelectedStoreId] = useState('');

  const storeOptions = useMemo(
    () =>
      (stores ?? []).map((store) => {
        const names = store.nameAllLocales ?? [];
        const name = names.find((n) => n.locale === dataLocale) ?? names[0];
        return { value: store.id, label: name?.value ?? store.key };
      }),
    [stores, dataLocale]
  );

  const selectedStore = stores?.find((store) => store.id === selectedStoreId);
  const distributionChannel = selectedStore?.distributionChannels?.[0];
  const supplyChannel = selectedStore?.supplyChannels?.[0];

  const handleSubmit = async () => {
    if (!selectedStore) {
      notify('error', 'Please select a store');
      return;
    }
    if (!distributionChannel || !supplyChannel) {
      notify(
        'error',
        'This store needs a distribution channel and an inventory supply channel. Add them to the store in the Merchant Center, or create a new store here.'
      );
      return;
    }

    try {
      await updateStoreCustom({
        storeId: selectedStore.id,
        typeKey: 'tiktok-store-type',
        fields: { isTikTokShop: true },
      });
      notify('success', 'Store selected. Reloading...');
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      notify(
        'error',
        error instanceof Error
          ? error.message
          : 'Failed to update configuration'
      );
    }
  };

  return (
    <Stack direction="column" gap="400">
      <Card.Root variant="outlined-elevated">
        <Card.Body>
          <Stack direction="column" gap="400">
            <Field
              label="Select Store"
              description="The connector keeps the TikTok shop details and tokens on this store. Use a store dedicated to TikTok."
              isRequired
            >
              <OptionSelect
                name="store"
                value={selectedStoreId}
                options={storeOptions}
                onChange={setSelectedStoreId}
                isDisabled={isSubmitting}
                placeholder="Select a store"
              />
            </Field>
            {selectedStore && (
              <Stack direction="column" gap="300">
                <ChannelSummary
                  title="Distribution Channel"
                  channel={distributionChannel}
                />
                <ChannelSummary
                  title="Supply Channel"
                  channel={supplyChannel}
                />
              </Stack>
            )}
          </Stack>
        </Card.Body>
      </Card.Root>
      <div>
        <Button
          variant="solid"
          colorPalette="primary"
          onPress={() => void handleSubmit()}
          isDisabled={isSubmitting || !selectedStoreId}
        >
          Continue
        </Button>
      </div>
    </Stack>
  );
};

/**
 * First step: the store the connector keeps its state on (tokens, shop,
 * mappings), chosen or created. The warehouse is set in the last step, once
 * TikTok is authorized and its warehouses are known.
 */
const StoreConfigWizard = () => {
  const { stores, loading } = useStoresFetcher();
  const [mode, setMode] = useState<'existing' | 'new'>('existing');

  if (loading) {
    return <LoadingSpinner />;
  }

  const hasStores = (stores ?? []).length > 0;
  const effectiveMode = hasStores ? mode : 'new';

  return (
    <Page
      title="Configuration Wizard"
      description="Step 1 of 3: choose or create the store the connector uses. Next you authorize TikTok, then choose the TikTok warehouse."
    >
      <RadioInput.Root
        name="store-mode"
        aria-label="Existing or new store"
        orientation="horizontal"
        value={effectiveMode}
        onChange={(next) => setMode(next === 'new' ? 'new' : 'existing')}
      >
        <RadioInput.Option value="existing" isDisabled={!hasStores}>
          Use an existing store
        </RadioInput.Option>
        <RadioInput.Option value="new">Create a new store</RadioInput.Option>
      </RadioInput.Root>
      {effectiveMode === 'existing' ? <ExistingStoreForm /> : <NewStoreForm />}
    </Page>
  );
};

StoreConfigWizard.displayName = 'StoreConfigWizard';

export default StoreConfigWizard;
