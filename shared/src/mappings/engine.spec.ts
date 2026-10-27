import type { Attribute } from '@commercetools/platform-sdk';
import {
  applyTransform,
  getProductTypeMapping,
  pickLocalized,
  resolveProductAttribute,
  resolveProductAttributes,
  resolveSkuAttribute,
  resolveSkuAttributes,
} from './engine';
import { attributeMappingSchema, type AttributeMapping } from './schema';

const attrs: Attribute[] = [
  { name: 'color', value: { 'en-US': 'Red', 'de-DE': 'Rot' } },
  { name: 'size', value: { key: 'm', label: 'Medium' } },
  { name: 'fit', value: { key: 'slim', label: { 'en-US': 'Slim fit' } } },
  { name: 'material', value: ['Cotton', 'Wool'] },
  { name: 'pieces', value: 3 },
  { name: 'organic', value: true },
  { name: 'weight', value: '1.50' },
  { name: 'empty', value: '' },
];

const mapping = (extra: Partial<AttributeMapping>): AttributeMapping =>
  ({
    tiktokAttributeId: '100',
    ctAttribute: 'color',
    ...extra,
  }) as AttributeMapping;

describe('pickLocalized', () => {
  const localized = { 'en-US': 'Red', 'de-DE': 'Rot' };
  it('prefers an exact match, then case-insensitive, then same language', () => {
    expect(pickLocalized(localized, 'de-DE')).toBe('Rot');
    expect(pickLocalized(localized, 'de-de')).toBe('Rot');
    expect(pickLocalized(localized, 'en')).toBe('Red');
    expect(pickLocalized({ en: 'Red' }, 'en-GB')).toBe('Red');
    expect(pickLocalized(localized, 'fr-FR')).toBeUndefined();
  });
});

describe('applyTransform', () => {
  it('identity: scalars as text, enums by key, localized strings by locale', () => {
    expect(applyTransform(undefined, attrs[0].value, 'en-US')).toEqual(['Red']);
    expect(applyTransform('identity', attrs[1].value, 'en-US')).toEqual(['m']);
    expect(applyTransform('identity', 3, 'en-US')).toEqual(['3']);
    expect(applyTransform('identity', true, 'en-US')).toEqual(['true']);
  });

  it('expands sets and drops empty text', () => {
    expect(applyTransform('identity', ['Cotton', '', 'Wool'], 'en-US')).toEqual(
      ['Cotton', 'Wool'],
    );
  });

  it('lowercase / uppercase', () => {
    expect(applyTransform('lowercase', 'ReD', 'en')).toEqual(['red']);
    expect(applyTransform('uppercase', 'ReD', 'en')).toEqual(['RED']);
  });

  it('number normalizes numeric text and drops the rest', () => {
    expect(applyTransform('number', '1.50', 'en')).toEqual(['1.5']);
    expect(applyTransform('number', 'abc', 'en')).toEqual([]);
    expect(applyTransform('number', ' ', 'en')).toEqual([]);
  });

  it('boolean understands common literals', () => {
    expect(applyTransform('boolean', 'Yes', 'en')).toEqual(['true']);
    expect(applyTransform('boolean', false, 'en')).toEqual(['false']);
    expect(applyTransform('boolean', '0', 'en')).toEqual(['false']);
    expect(applyTransform('boolean', 'maybe', 'en')).toEqual([]);
  });

  it('enumKeyToLabel returns the label, localized when needed', () => {
    expect(applyTransform('enumKeyToLabel', attrs[1].value, 'en-US')).toEqual([
      'Medium',
    ]);
    expect(applyTransform('enumKeyToLabel', attrs[2].value, 'en-US')).toEqual([
      'Slim fit',
    ]);
    expect(applyTransform('enumKeyToLabel', 'plain', 'en-US')).toEqual([
      'plain',
    ]);
  });

  it('localizedPick picks the locale from localized strings and enum labels', () => {
    expect(applyTransform('localizedPick', attrs[0].value, 'de-DE')).toEqual([
      'Rot',
    ]);
    expect(applyTransform('localizedPick', attrs[2].value, 'en-US')).toEqual([
      'Slim fit',
    ]);
    expect(applyTransform('localizedPick', attrs[0].value, 'fr-FR')).toEqual(
      [],
    );
  });
});

describe('resolveSkuAttribute', () => {
  it('ports the old valueNameFetcher: localized text as valueName', () => {
    expect(
      resolveSkuAttribute(
        mapping({ transform: 'localizedPick' }),
        attrs,
        'en-US',
      ),
    ).toEqual({ id: '100', valueName: 'Red' });
  });

  it('ports the old valueIdFetcher: valueMap yields a value id', () => {
    const result = resolveSkuAttribute(
      mapping({ ctAttribute: 'size', valueMap: { m: { id: '555' } } }),
      attrs,
      'en-US',
    );
    expect(result).toEqual({ id: '100', valueId: '555' });
  });

  it('sends unmapped text as a free-text name', () => {
    expect(
      resolveSkuAttribute(
        mapping({ ctAttribute: 'size', valueMap: { l: { id: '1' } } }),
        attrs,
        'en-US',
      ),
    ).toEqual({ id: '100', valueName: 'm' });
  });

  it('keeps both id and name when the map provides both', () => {
    expect(
      resolveSkuAttribute(
        mapping({
          ctAttribute: 'size',
          valueMap: { m: { id: '9', name: 'M' } },
        }),
        attrs,
        'en-US',
      ),
    ).toEqual({ id: '100', valueId: '9', valueName: 'M' });
  });

  it('uses the first value of a set', () => {
    expect(
      resolveSkuAttribute(mapping({ ctAttribute: 'material' }), attrs, 'en'),
    ).toEqual({ id: '100', valueName: 'Cotton' });
  });

  it('is undefined for missing or empty attributes', () => {
    expect(
      resolveSkuAttribute(mapping({ ctAttribute: 'nope' }), attrs, 'en'),
    ).toBeUndefined();
    expect(
      resolveSkuAttribute(mapping({ ctAttribute: 'empty' }), attrs, 'en'),
    ).toBeUndefined();
    expect(
      resolveSkuAttribute(mapping({}), undefined, 'en-US'),
    ).toBeUndefined();
  });

  it('filters unresolved entries from a list', () => {
    const list = resolveSkuAttributes(
      [
        mapping({ transform: 'localizedPick' }),
        mapping({ ctAttribute: 'nope' }),
      ],
      attrs,
      'en-US',
    );
    expect(list).toEqual([{ id: '100', valueName: 'Red' }]);
  });
});

describe('resolveProductAttribute', () => {
  it('ports the old constant valueIdsFetcher', () => {
    const result = resolveProductAttribute(
      {
        tiktokAttributeId: '101619',
        constantValues: [{ id: '1000059' }],
      },
      undefined,
      'en-US',
    );
    expect(result).toEqual({ id: '101619', values: [{ id: '1000059' }] });
  });

  it('maps every element of a set and applies the valueMap per element', () => {
    const result = resolveProductAttribute(
      mapping({
        tiktokAttributeId: '7',
        ctAttribute: 'material',
        transform: 'lowercase',
        valueMap: { cotton: { id: '11' } },
      }),
      attrs,
      'en',
    );
    expect(result).toEqual({
      id: '7',
      values: [{ id: '11' }, { name: 'wool' }],
    });
  });

  it('omits attributes without values', () => {
    expect(
      resolveProductAttributes([mapping({ ctAttribute: 'nope' })], attrs, 'en'),
    ).toEqual([]);
  });
});

describe('mapping schema', () => {
  it('requires exactly one of ctAttribute and constantValues', () => {
    expect(
      attributeMappingSchema.safeParse({ tiktokAttributeId: '1' }).success,
    ).toBe(false);
    expect(
      attributeMappingSchema.safeParse({
        tiktokAttributeId: '1',
        ctAttribute: 'a',
        constantValues: [{ id: '1' }],
      }).success,
    ).toBe(false);
    expect(
      attributeMappingSchema.safeParse({
        tiktokAttributeId: '1',
        ctAttribute: 'a',
      }).success,
    ).toBe(true);
  });

  it('rejects unknown transforms and empty value refs', () => {
    expect(
      attributeMappingSchema.safeParse({
        tiktokAttributeId: '1',
        ctAttribute: 'a',
        transform: 'eval',
      }).success,
    ).toBe(false);
    expect(
      attributeMappingSchema.safeParse({
        tiktokAttributeId: '1',
        ctAttribute: 'a',
        valueMap: { x: {} },
      }).success,
    ).toBe(false);
  });
});

describe('getProductTypeMapping', () => {
  it('looks up by product type id', () => {
    const config = {
      version: 1 as const,
      productTypes: {
        pt1: { categoryId: 'c', productAttributes: [], skuAttributes: [] },
      },
    };
    expect(getProductTypeMapping(config, 'pt1')?.categoryId).toBe('c');
    expect(getProductTypeMapping(config, 'pt2')).toBeUndefined();
  });
});
