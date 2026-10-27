import { useRef, useState, type ReactNode } from 'react';
import {
  Button,
  Card,
  Checkbox,
  Heading,
  Stack,
  Text,
  TextInput,
} from '@commercetools/nimbus';
import { useApplicationContext } from '@commercetools-frontend/application-shell-connectors';
import { useChannelsFetcher } from '../../hooks/use-channels-connector';
import {
  INVENTORY_ROLE,
  PRICE_ROLE,
  isValidKey,
  toKey,
  useProductSelectionsFetcher,
  useStoreCreator,
  type CreatedResources,
  type StoreSetupInput,
} from '../../hooks/use-store-setup';
import ErrorAlert from '../ui/error-alert';
import Field from '../ui/field';
import type { SelectOption } from '../ui/option-select';
import ResourceChoiceField, {
  initialChoice,
  resolveChoice,
} from './resource-choice-field';
import { useNotify } from './use-notify';

type Localized = { locale: string; value: string }[] | undefined;

const labelOf = (
  names: Localized,
  key: string | undefined,
  locale: string
): string => {
  const name = names?.find((n) => n.locale === locale) ?? names?.[0];
  if (name && key) return `${name.value} (${key})`;
  return name?.value ?? key ?? '';
};

const Section = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) => (
  <Card.Root variant="outlined-elevated">
    <Card.Body>
      <Stack direction="column" gap="300">
        <Heading as="h2" size="md">
          {title}
        </Heading>
        {description && (
          <Text color="neutral.11" textStyle="sm">
            {description}
          </Text>
        )}
        {children}
      </Stack>
    </Card.Body>
  </Card.Root>
);

/**
 * Creates a store for TikTok with an optional product selection and channels (new, or
 * existing ones of the project), and marks it `isTikTokShop`. The warehouse is
 * not asked here: TikTok has to be authorized first.
 */
const NewStoreForm = () => {
  const notify = useNotify();
  const dataLocale =
    useApplicationContext((context) => context.dataLocale) ?? 'en';
  const { channels } = useChannelsFetcher();
  const { productSelections, error: selectionsError } =
    useProductSelectionsFetcher();
  const { createTikTokStore, loading } = useStoreCreator();
  const created = useRef<CreatedResources>({});

  const [storeName, setStoreName] = useState('TikTok Store');
  const [storeKey, setStoreKey] = useState(toKey('TikTok Store'));
  const [storeKeyEdited, setStoreKeyEdited] = useState(false);
  const [withSelection, setWithSelection] = useState(true);
  const [selection, setSelection] = useState(initialChoice('TikTok Products'));
  const [oneChannel, setOneChannel] = useState(true);
  const [sharedChannel, setSharedChannel] = useState(
    initialChoice('TikTok Channel')
  );
  const [priceChannel, setPriceChannel] = useState(
    initialChoice('TikTok Price Channel')
  );
  const [inventoryChannel, setInventoryChannel] = useState(
    initialChoice('TikTok Inventory Channel')
  );

  const selectionOptions: SelectOption[] = (productSelections ?? []).map(
    (item) => ({
      value: item.id,
      label: labelOf(item.nameAllLocales, item.key, dataLocale),
    })
  );
  const channelOptions = (roles: string[]): SelectOption[] =>
    (channels ?? [])
      .filter((channel) => roles.every((role) => channel.roles.includes(role)))
      .map((channel) => ({
        value: channel.id,
        label: labelOf(channel.nameAllLocales, channel.key, dataLocale),
      }));
  const priceOptions = channelOptions([PRICE_ROLE]);
  const inventoryOptions = channelOptions([INVENTORY_ROLE]);
  const sharedOptions = channelOptions([PRICE_ROLE, INVENTORY_ROLE]);

  const selectionChoice = resolveChoice(selection, selectionOptions.length);
  const sharedChoice = resolveChoice(sharedChannel, sharedOptions.length);
  const priceChoice = resolveChoice(priceChannel, priceOptions.length);
  const inventoryChoice = resolveChoice(
    inventoryChannel,
    inventoryOptions.length
  );

  const sameNewKey =
    !oneChannel &&
    priceChoice?.mode === 'new' &&
    inventoryChoice?.mode === 'new' &&
    priceChoice.key === inventoryChoice.key;

  const channelsInput: StoreSetupInput['channels'] | undefined = oneChannel
    ? sharedChoice && { shared: true, channel: sharedChoice }
    : priceChoice &&
      inventoryChoice && {
        shared: false,
        price: priceChoice,
        inventory: inventoryChoice,
      };

  const input: StoreSetupInput | undefined =
    storeName.trim() &&
    isValidKey(storeKey) &&
    (!withSelection || selectionChoice) &&
    channelsInput &&
    !sameNewKey
      ? {
          locale: dataLocale,
          store: { name: storeName.trim(), key: storeKey },
          ...(withSelection && selectionChoice
            ? { productSelection: selectionChoice }
            : {}),
          channels: channelsInput,
        }
      : undefined;

  const handleSubmit = async () => {
    if (!input) return;
    try {
      await createTikTokStore(input, created.current);
    } catch (error) {
      notify(
        'error',
        `The store could not be created: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return;
    }
    notify('success', 'Store created. Reloading...');
    setTimeout(() => window.location.reload(), 1500);
  };

  return (
    <Stack direction="column" gap="400">
      {selectionsError && (
        <ErrorAlert
          title="The product selections could not be read"
          error={selectionsError}
        />
      )}
      <Section title="Store">
        <Field label="Store name" isRequired>
          <TextInput
            name="store-name"
            aria-label="Store name"
            value={storeName}
            onChange={(name) => {
              setStoreName(name);
              if (!storeKeyEdited) setStoreKey(toKey(name));
            }}
            isDisabled={loading}
          />
        </Field>
        <Field
          label="Store key"
          description="Letters, digits, - and _ only, at least 2 characters. It can not be changed later."
          isRequired
        >
          <TextInput
            name="store-key"
            aria-label="Store key"
            value={storeKey}
            onChange={(key) => {
              setStoreKey(key);
              setStoreKeyEdited(true);
            }}
            isDisabled={loading}
          />
        </Field>
      </Section>

      <Section
        title="Product selection"
        description="Which products the store sells. Add products to the selection in the Merchant Center. You can also create the store without one and add it later."
      >
        <Checkbox
          isSelected={withSelection}
          onChange={setWithSelection}
          isDisabled={loading}
        >
          Add a product selection to the store
        </Checkbox>
        {withSelection && (
          <ResourceChoiceField
            noun="product selection"
            options={selectionOptions}
            value={selection}
            onChange={setSelection}
            isDisabled={loading}
            emptyHint="This project has no product selection yet."
          />
        )}
      </Section>

      <Section
        title="Channels"
        description="The price channel (distribution) and the inventory channel (supply) of the store."
      >
        <Checkbox
          isSelected={oneChannel}
          onChange={setOneChannel}
          isDisabled={loading}
        >
          Use one channel for both price and inventory
        </Checkbox>
        {oneChannel ? (
          <ResourceChoiceField
            noun="channel"
            options={sharedOptions}
            value={sharedChannel}
            onChange={setSharedChannel}
            isDisabled={loading}
            emptyHint="No channel has both the ProductDistribution and InventorySupply roles."
          />
        ) : (
          <Stack direction="column" gap="500">
            <Stack direction="column" gap="200">
              <Text fontWeight="600">Price channel</Text>
              <ResourceChoiceField
                noun="price channel"
                options={priceOptions}
                value={priceChannel}
                onChange={setPriceChannel}
                isDisabled={loading}
                emptyHint="No channel has the ProductDistribution role."
              />
            </Stack>
            <Stack direction="column" gap="200">
              <Text fontWeight="600">Inventory channel</Text>
              <ResourceChoiceField
                noun="inventory channel"
                options={inventoryOptions}
                value={inventoryChannel}
                onChange={setInventoryChannel}
                isDisabled={loading}
                emptyHint="No channel has the InventorySupply role."
              />
            </Stack>
            {sameNewKey && (
              <Text color="critical.11">
                The two new channels need different keys.
              </Text>
            )}
          </Stack>
        )}
      </Section>

      <div>
        <Button
          variant="solid"
          colorPalette="primary"
          onPress={() => void handleSubmit()}
          isDisabled={loading || !input}
        >
          Create store and continue
        </Button>
      </div>
    </Stack>
  );
};

NewStoreForm.displayName = 'NewStoreForm';

export default NewStoreForm;
