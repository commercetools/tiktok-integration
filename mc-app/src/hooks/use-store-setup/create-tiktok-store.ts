export type LocalizedName = { locale: string; value: string }[];

/** An existing resource, or one to create first. */
export type ResourceChoice =
  | { mode: 'existing'; id: string }
  | { mode: 'new'; name: string; key: string };

export type StoreSetupInput = {
  locale: string;
  store: { name: string; key: string };
  /** Omitted to create the store without a product selection. */
  productSelection?: ResourceChoice;
  channels:
    | { shared: true; channel: ResourceChoice }
    | { shared: false; price: ResourceChoice; inventory: ResourceChoice };
};

type Identifier = { id: string };

export type StoreSetupDeps = {
  createProductSelection: (draft: {
    key: string;
    name: LocalizedName;
  }) => Promise<Identifier>;
  createChannel: (draft: {
    key: string;
    name: LocalizedName;
    roles: string[];
  }) => Promise<Identifier>;
  createStore: (draft: {
    key: string;
    name: LocalizedName;
    distributionChannels: { typeId: 'channel'; id: string }[];
    supplyChannels: { typeId: 'channel'; id: string }[];
    productSelections: {
      productSelection: { typeId: 'product-selection'; id: string };
      active: boolean;
    }[];
    custom: {
      typeKey: string;
      fields: { name: string; value: string }[];
    };
  }) => Promise<Identifier>;
};

/** Ids of resources already created, so a retry after a failure does not create them twice. */
export type CreatedResources = Partial<
  Record<
    'productSelection' | 'sharedChannel' | 'priceChannel' | 'inventoryChannel',
    string
  >
>;

export const PRICE_ROLE = 'ProductDistribution';
export const INVENTORY_ROLE = 'InventorySupply';

/**
 * Creates the store, and the product selection (when asked for) and channels
 * that are new, in that order. The store is created last and already marked `isTikTokShop`.
 * Channels get no custom type yet: the channel type requires the TikTok
 * warehouse ID, which is only known after TikTok is authorized.
 */
export const createTikTokStore = async (
  input: StoreSetupInput,
  deps: StoreSetupDeps,
  created: CreatedResources = {}
): Promise<Identifier> => {
  const name = (value: string): LocalizedName => [
    { locale: input.locale, value },
  ];

  const resolve = async (
    slot: keyof CreatedResources,
    choice: ResourceChoice,
    create: (draft: { key: string; name: LocalizedName }) => Promise<Identifier>
  ): Promise<string> => {
    if (choice.mode === 'existing') return choice.id;
    const known = created[slot];
    if (known) return known;
    const { id } = await create({ key: choice.key, name: name(choice.name) });
    created[slot] = id;
    return id;
  };

  const productSelectionId = input.productSelection
    ? await resolve(
        'productSelection',
        input.productSelection,
        deps.createProductSelection
      )
    : undefined;

  let priceChannelId: string;
  let inventoryChannelId: string;
  if (input.channels.shared) {
    priceChannelId = inventoryChannelId = await resolve(
      'sharedChannel',
      input.channels.channel,
      (draft) =>
        deps.createChannel({ ...draft, roles: [PRICE_ROLE, INVENTORY_ROLE] })
    );
  } else {
    priceChannelId = await resolve(
      'priceChannel',
      input.channels.price,
      (draft) => deps.createChannel({ ...draft, roles: [PRICE_ROLE] })
    );
    inventoryChannelId = await resolve(
      'inventoryChannel',
      input.channels.inventory,
      (draft) => deps.createChannel({ ...draft, roles: [INVENTORY_ROLE] })
    );
  }

  return deps.createStore({
    key: input.store.key,
    name: name(input.store.name),
    distributionChannels: [{ typeId: 'channel', id: priceChannelId }],
    supplyChannels: [{ typeId: 'channel', id: inventoryChannelId }],
    productSelections: productSelectionId
      ? [
          {
            productSelection: {
              typeId: 'product-selection',
              id: productSelectionId,
            },
            active: true,
          },
        ]
      : [],
    custom: {
      typeKey: 'tiktok-store-type',
      fields: [{ name: 'isTikTokShop', value: 'true' }],
    },
  });
};
