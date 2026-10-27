import type {
  Price,
  ProductProjection,
  ProductVariant,
} from '@commercetools/platform-sdk';
import type { ShopContext } from '../../interfaces';
import type { MappingConfig } from '../../mappings/schema';
import {
  buildTiktokProductDraft,
  commercetoolsPriceToTiktokPrice,
  commercetoolsVariantToListPrice,
  commercetoolsVariantToPrice,
  type ProductMappingContext,
} from './product.mapper';

const shop: ShopContext = {
  locale: 'en-US',
  shopRegion: 'US',
  ctSupplyChannelId: 'supply-1',
  ctDistributionChannelId: 'price-1',
  tiktokWarehouseId: 'wh-1',
};

const mappings: MappingConfig = {
  version: 1,
  productTypes: {
    'pt-1': {
      categoryId: '2268304',
      skuAttributes: [
        {
          tiktokAttributeId: '100000',
          ctAttribute: 'color',
          transform: 'localizedPick',
        },
      ],
      productAttributes: [
        { tiktokAttributeId: '101619', constantValues: [{ id: '1000059' }] },
        {
          tiktokAttributeId: '7',
          ctAttribute: 'material',
          transform: 'lowercase',
        },
      ],
    },
  },
};

const context: ProductMappingContext = { shop, mappings };

const money = (centAmount: number) => ({
  type: 'centPrecision' as const,
  currencyCode: 'USD',
  centAmount,
  fractionDigits: 2,
});

const price = (overrides: Partial<Price>): Price =>
  ({ id: 'p', value: money(1999), country: 'US', ...overrides }) as Price;

const variant = (overrides: Partial<ProductVariant> = {}): ProductVariant =>
  ({
    id: 1,
    sku: 'SKU-1',
    prices: [
      price({ id: 'list', value: money(2999) }),
      price({
        id: 'tt',
        channel: { typeId: 'channel', id: 'price-1' },
        value: money(1999),
        discounted: {
          value: money(1499),
          discount: { typeId: 'product-discount', id: 'd' },
        },
      }),
    ],
    availability: {
      channels: { 'supply-1': { availableQuantity: 5, isOnStock: true } },
    },
    attributes: [
      { name: 'color', value: { 'en-US': 'Red' } },
      { name: 'weightUnit', value: { key: 'KILOGRAM', label: 'kg' } },
      { name: 'weightValue', value: 1.23456 },
      { name: 'heightValue', value: 10 },
      { name: 'lengthValue', value: 20 },
      { name: 'widthValue', value: 5 },
      { name: 'dimensionUnit', value: { key: 'CENTIMETER', label: 'cm' } },
      { name: 'material', value: ['Cotton'] },
    ],
    ...overrides,
  }) as ProductVariant;

const product = (
  overrides: Partial<ProductProjection> = {},
): ProductProjection =>
  ({
    id: 'prod-1',
    published: true,
    productType: { typeId: 'product-type', id: 'pt-1' },
    name: { 'en-US': 'Mug' },
    description: { 'en-US': 'A mug' },
    masterVariant: variant(),
    variants: [variant({ id: 2, sku: 'SKU-2' })],
    ...overrides,
  }) as ProductProjection;

describe('buildTiktokProductDraft', () => {
  it('maps a product with mapped attributes, prices, inventory and package data', () => {
    expect(
      buildTiktokProductDraft(product(), context, {
        includeExternalProductId: true,
      }),
    ).toMatchSnapshot();
  });

  it('omits externalProductId unless requested', () => {
    expect(buildTiktokProductDraft(product(), context)).not.toHaveProperty(
      'externalProductId',
    );
  });

  it('saves unpublished products as drafts', () => {
    expect(
      buildTiktokProductDraft(product({ published: false }), context).saveMode,
    ).toBe('AS_DRAFT');
  });

  it('skips variants without stock in the supply channel or without a channel price', () => {
    const draft = buildTiktokProductDraft(
      product({
        variants: [
          variant({ id: 2, sku: 'NO-STOCK', availability: { channels: {} } }),
          variant({ id: 3, sku: 'NO-PRICE', prices: [price({})] }),
        ],
      }),
      context,
    );
    expect(draft.skus?.map((sku) => sku.sellerSku)).toEqual(['SKU-1']);
  });

  it('requires a mapped category', () => {
    expect(() =>
      buildTiktokProductDraft(product(), {
        shop,
        mappings: { version: 1, productTypes: {} },
      }),
    ).toThrow(/Category ID is required.*pt-1/);
  });

  it('requires at least one sellable sku', () => {
    expect(() =>
      buildTiktokProductDraft(
        product({
          masterVariant: variant({ availability: { channels: {} } }),
          variants: [],
        }),
        context,
      ),
    ).toThrow('SKUs are required');
  });

  it('falls back to default package weight and dimensions', () => {
    const bare = variant({
      attributes: [{ name: 'color', value: { 'en-US': 'Red' } }],
    });
    const draft = buildTiktokProductDraft(
      product({ masterVariant: bare, variants: [] }),
      context,
    );
    expect(draft.packageWeight).toEqual({ value: '1.00', unit: 'POUND' });
    expect(draft.packageDimensions).toEqual({
      height: '2',
      length: '2',
      width: '2',
      unit: 'INCH',
    });
  });

  it('formats weight by unit precision and never emits NaN', () => {
    const withWeight = (unit: string, value: unknown) =>
      buildTiktokProductDraft(
        product({
          masterVariant: variant({
            attributes: [
              { name: 'weightUnit', value: { key: unit, label: unit } },
              { name: 'weightValue', value },
            ],
          }),
          variants: [],
        }),
        context,
      ).packageWeight;
    expect(withWeight('GRAM', 12.6)).toEqual({ value: '13', unit: 'GRAM' });
    expect(withWeight('POUND', 1.234)).toEqual({
      value: '1.23',
      unit: 'POUND',
    });
    expect(withWeight('GRAM', undefined)).toEqual({
      value: '1.00',
      unit: 'POUND',
    });
  });
});

describe('price mapping', () => {
  it('uses the distribution channel price and its discount as sale price', () => {
    expect(commercetoolsVariantToPrice(variant(), shop)).toEqual({
      amount: '19.99',
      currency: 'USD',
      salePrice: '14.99',
    });
  });

  it('requires a shop region and a matching channel price', () => {
    expect(
      commercetoolsVariantToPrice(variant(), {
        ...shop,
        shopRegion: undefined,
      }),
    ).toBeUndefined();
    expect(
      commercetoolsVariantToPrice(variant(), {
        ...shop,
        ctDistributionChannelId: 'other',
      }),
    ).toBeUndefined();
    expect(
      commercetoolsVariantToPrice(variant(), { ...shop, shopRegion: 'DE' }),
    ).toBeUndefined();
  });

  it('matches regions case-insensitively', () => {
    expect(
      commercetoolsVariantToPrice(variant(), { ...shop, shopRegion: 'us' }),
    ).toBeDefined();
  });

  it('takes the list price from the no-channel price for the region', () => {
    expect(commercetoolsVariantToListPrice(variant(), 'US')).toEqual({
      amount: '29.99',
      currency: 'USD',
    });
    expect(
      commercetoolsVariantToListPrice(variant(), undefined),
    ).toBeUndefined();
    expect(commercetoolsVariantToListPrice(variant(), 'DE')).toBeUndefined();
  });

  it('formats zero as "0" and respects fraction digits', () => {
    expect(commercetoolsPriceToTiktokPrice(price({ value: money(0) }))).toEqual(
      { amount: '0', currency: 'USD', salePrice: '0' },
    );
    expect(
      commercetoolsPriceToTiktokPrice(
        price({ value: { ...money(1500), fractionDigits: 0 } }),
      )?.amount,
    ).toBe('1500');
  });
});
