import fs from 'fs';
import path from 'path';
import {
  buildClientSchema,
  coerceInputValue,
  type GraphQLInputType,
  type GraphQLSchema,
} from 'graphql';
import {
  createTikTokStore,
  type CreatedResources,
  type StoreSetupDeps,
  type StoreSetupInput,
} from './create-tiktok-store';

const newOne = (name: string, key: string) =>
  ({ mode: 'new', name, key } as const);

const makeDeps = () => {
  let next = 0;
  const calls: string[] = [];
  const deps = {
    createProductSelection: jest.fn(
      async (
        ..._args: Parameters<StoreSetupDeps['createProductSelection']>
      ) => {
        calls.push('selection');
        return { id: `sel-${++next}` };
      }
    ),
    createChannel: jest.fn(
      async (..._args: Parameters<StoreSetupDeps['createChannel']>) => {
        calls.push('channel');
        return { id: `ch-${++next}` };
      }
    ),
    createStore: jest.fn(
      async (..._args: Parameters<StoreSetupDeps['createStore']>) => {
        calls.push('store');
        return { id: 'store-1' };
      }
    ),
  };
  return { deps: deps as StoreSetupDeps, mocks: deps, calls };
};

const input = (overrides: Partial<StoreSetupInput> = {}): StoreSetupInput => ({
  locale: 'en',
  store: { name: 'TikTok Store', key: 'tiktok-store' },
  productSelection: newOne('TikTok Products', 'tiktok-products'),
  channels: {
    shared: true,
    channel: newOne('TikTok Channel', 'tiktok-channel'),
  },
  ...overrides,
});

describe('createTikTokStore', () => {
  it('creates the selection and one shared channel, then the flagged store', async () => {
    const { deps, mocks, calls } = makeDeps();
    await expect(createTikTokStore(input(), deps)).resolves.toEqual({
      id: 'store-1',
    });

    expect(calls).toEqual(['selection', 'channel', 'store']);
    expect(mocks.createProductSelection).toHaveBeenCalledWith({
      key: 'tiktok-products',
      name: [{ locale: 'en', value: 'TikTok Products' }],
    });
    expect(mocks.createChannel).toHaveBeenCalledTimes(1);
    expect(mocks.createChannel).toHaveBeenCalledWith({
      key: 'tiktok-channel',
      name: [{ locale: 'en', value: 'TikTok Channel' }],
      roles: ['ProductDistribution', 'InventorySupply'],
    });
    expect(mocks.createStore).toHaveBeenCalledWith({
      key: 'tiktok-store',
      name: [{ locale: 'en', value: 'TikTok Store' }],
      distributionChannels: [{ typeId: 'channel', id: 'ch-2' }],
      supplyChannels: [{ typeId: 'channel', id: 'ch-2' }],
      productSelections: [
        {
          productSelection: { typeId: 'product-selection', id: 'sel-1' },
          active: true,
        },
      ],
      custom: {
        typeKey: 'tiktok-store-type',
        fields: [{ name: 'isTikTokShop', value: 'true' }],
      },
    });
  });

  it('creates a price and an inventory channel with their own role', async () => {
    const { deps, mocks } = makeDeps();
    await createTikTokStore(
      input({
        channels: {
          shared: false,
          price: newOne('Price', 'tiktok-price'),
          inventory: newOne('Stock', 'tiktok-stock'),
        },
      }),
      deps
    );

    expect(mocks.createChannel).toHaveBeenNthCalledWith(1, {
      key: 'tiktok-price',
      name: [{ locale: 'en', value: 'Price' }],
      roles: ['ProductDistribution'],
    });
    expect(mocks.createChannel).toHaveBeenNthCalledWith(2, {
      key: 'tiktok-stock',
      name: [{ locale: 'en', value: 'Stock' }],
      roles: ['InventorySupply'],
    });
    const draft = mocks.createStore.mock.calls[0]?.[0];
    expect(draft?.distributionChannels).toEqual([
      { typeId: 'channel', id: 'ch-2' },
    ]);
    expect(draft?.supplyChannels).toEqual([{ typeId: 'channel', id: 'ch-3' }]);
  });

  it('creates only what is new and uses existing resources as they are', async () => {
    const { deps, mocks } = makeDeps();
    await createTikTokStore(
      input({
        productSelection: { mode: 'existing', id: 'sel-existing' },
        channels: {
          shared: false,
          price: { mode: 'existing', id: 'ch-price' },
          inventory: newOne('Stock', 'tiktok-stock'),
        },
      }),
      deps
    );

    expect(mocks.createProductSelection).not.toHaveBeenCalled();
    expect(mocks.createChannel).toHaveBeenCalledTimes(1);
    const draft = mocks.createStore.mock.calls[0]?.[0];
    expect(draft?.productSelections[0]?.productSelection.id).toBe(
      'sel-existing'
    );
    expect(draft?.distributionChannels).toEqual([
      { typeId: 'channel', id: 'ch-price' },
    ]);
  });

  it('creates nothing but the store when everything exists', async () => {
    const { deps, mocks } = makeDeps();
    await createTikTokStore(
      input({
        productSelection: { mode: 'existing', id: 's' },
        channels: { shared: true, channel: { mode: 'existing', id: 'c' } },
      }),
      deps
    );
    expect(mocks.createProductSelection).not.toHaveBeenCalled();
    expect(mocks.createChannel).not.toHaveBeenCalled();
    expect(mocks.createStore).toHaveBeenCalledTimes(1);
  });

  it('does not create the store when a channel fails', async () => {
    const { deps, mocks } = makeDeps();
    mocks.createChannel.mockRejectedValueOnce(new Error('duplicate key'));
    await expect(createTikTokStore(input(), deps)).rejects.toThrow(
      'duplicate key'
    );
    expect(mocks.createStore).not.toHaveBeenCalled();
  });

  it('reuses what a failed attempt already created when retried', async () => {
    const { deps, mocks } = makeDeps();
    const created: CreatedResources = {};
    mocks.createStore.mockRejectedValueOnce(new Error('store key taken'));

    await expect(createTikTokStore(input(), deps, created)).rejects.toThrow(
      'store key taken'
    );
    expect(created).toEqual({
      productSelection: 'sel-1',
      sharedChannel: 'ch-2',
    });

    await createTikTokStore(
      input({ store: { name: 'Other', key: 'other' } }),
      deps,
      created
    );
    expect(mocks.createProductSelection).toHaveBeenCalledTimes(1);
    expect(mocks.createChannel).toHaveBeenCalledTimes(1);
    expect(mocks.createStore).toHaveBeenCalledTimes(2);
  });

  describe('drafts match the project GraphQL schema', () => {
    let schema: GraphQLSchema;
    beforeAll(() => {
      const raw = fs.readFileSync(
        path.join(__dirname, '../../../schemas/ctp.json'),
        'utf8'
      );
      schema = buildClientSchema(JSON.parse(raw));
    });

    const coerces = (typeName: string, value: unknown) =>
      coerceInputValue(
        value,
        schema.getType(typeName) as GraphQLInputType,
        (_, __, error) => {
          throw error;
        }
      );

    it('for the product selection, channels and store', async () => {
      const { deps, mocks } = makeDeps();
      await createTikTokStore(
        input({
          channels: {
            shared: false,
            price: newOne('Price', 'tiktok-price'),
            inventory: newOne('Stock', 'tiktok-stock'),
          },
        }),
        deps
      );

      expect(() =>
        coerces(
          'CreateProductSelectionDraft',
          mocks.createProductSelection.mock.calls[0]?.[0]
        )
      ).not.toThrow();
      for (const [draft] of mocks.createChannel.mock.calls) {
        expect(() => coerces('ChannelDraft', draft)).not.toThrow();
      }
      expect(() =>
        coerces('CreateStore', mocks.createStore.mock.calls[0]?.[0])
      ).not.toThrow();
    });
  });
});
