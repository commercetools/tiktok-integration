import type { TEnrichedProduct } from '../../hooks/use-products';
import {
  describeInventory,
  describeMappings,
  describePrice,
} from './product-offer';

const price = (
  channelId: string | undefined,
  centAmount: number,
  country = 'DE'
) => ({
  channelId,
  country,
  centAmount,
  currencyCode: 'EUR',
  fractionDigits: 2,
});

const product = (variants: TEnrichedProduct['variants']): TEnrichedProduct => ({
  id: 'p1',
  name: 'P',
  sku: 'S',
  productTypeId: 'pt1',
  variants,
});

const context = {
  distributionChannelId: 'dist',
  supplyChannelId: 'sup',
  region: 'de',
};

describe('describePrice', () => {
  it('shows the distribution channel price for the shop region', () => {
    const p = product([
      { prices: [price('dist', 1999), price('other', 5)], stock: {} },
    ]);
    expect(describePrice(p, context)).toBe('19.99 EUR');
  });

  it('shows a range over variants with different prices', () => {
    const p = product([
      { prices: [price('dist', 1000)], stock: {} },
      { prices: [price('dist', 2500)], stock: {} },
    ]);
    expect(describePrice(p, context)).toBe('10.00 EUR – 25.00 EUR');
  });

  it.each([
    ['no channel', [price(undefined, 1000)]],
    ['another channel', [price('other', 1000)]],
    ['another country', [price('dist', 1000, 'US')]],
    ['no prices', []],
  ])('says there is no price for %s', (_, prices) => {
    expect(describePrice(product([{ prices, stock: {} }]), context)).toBe(
      'No price'
    );
  });
});

describe('describeInventory', () => {
  it('sums the supply channel stock of the variants', () => {
    const p = product([
      { prices: [], stock: { sup: 3 } },
      { prices: [], stock: { sup: 4, other: 100 } },
    ]);
    expect(describeInventory(p, context)).toBe('7');
  });

  it('shows 0 for an entry with no stock, and says so when there is no entry', () => {
    expect(
      describeInventory(product([{ prices: [], stock: { sup: 0 } }]), context)
    ).toBe('0');
    expect(
      describeInventory(product([{ prices: [], stock: { other: 5 } }]), context)
    ).toBe('No inventory');
  });
});

describe('describeMappings', () => {
  const mappings = {
    productTypes: {
      pt1: {
        categoryId: 'c',
        productAttributes: [
          { tiktokAttributeId: 'a1', name: 'Brand', ctAttribute: 'brand' },
        ],
        skuAttributes: [
          { tiktokAttributeId: 'a2', ctAttribute: 'color' },
          {
            tiktokAttributeId: 'a3',
            name: 'Material',
            constantValues: [{ name: 'Cotton' }],
          },
        ],
      },
    },
  };

  it('lists every mapped attribute as "commercetools > TikTok"', () => {
    expect(describeMappings(product([]), mappings)).toEqual([
      'brand > Brand',
      'color > a2',
      'fixed value > Material',
    ]);
  });

  it('is empty for a product type without a mapping', () => {
    expect(
      describeMappings({ ...product([]), productTypeId: 'other' }, mappings)
    ).toEqual([]);
  });
});
