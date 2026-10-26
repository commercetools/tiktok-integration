import { buildCustomFieldActions, readCustomField } from './custom-fields';

// `customFieldsRaw` values come back decoded, whatever the field type.
const store = {
  custom: {
    type: { id: 't1', key: 'tiktok-store-type' },
    customFieldsRaw: [
      { name: 'isTikTokShop', value: true },
      { name: 'tiktokShopId', value: 'shop-1' },
      { name: 'warehouseId', value: '7123456789012345678' },
      { name: 'looksLikeBoolean', value: 'true' },
      { name: 'count', value: 42 },
    ],
  },
};

describe('readCustomField', () => {
  it('returns the decoded value as it is', () => {
    expect(readCustomField(store, 'isTikTokShop')).toBe(true);
    expect(readCustomField(store, 'tiktokShopId')).toBe('shop-1');
    expect(readCustomField(store, 'count')).toBe(42);
  });

  it('keeps a string that looks like a number or a boolean a string', () => {
    expect(readCustomField(store, 'warehouseId')).toBe('7123456789012345678');
    expect(readCustomField(store, 'looksLikeBoolean')).toBe('true');
  });

  it('returns undefined for a missing field or resource', () => {
    expect(readCustomField(store, 'missing')).toBeUndefined();
    expect(readCustomField(undefined, 'isTikTokShop')).toBeUndefined();
  });
});

describe('buildCustomFieldActions', () => {
  it('sets only the given fields when the resource already has the type', () => {
    expect(
      buildCustomFieldActions(store, 'tiktok-store-type', {
        isTikTokShop: true,
      })
    ).toEqual([{ setCustomField: { name: 'isTikTokShop', value: 'true' } }]);
  });

  it('sets the type with JSON-encoded fields when the resource has none', () => {
    expect(
      buildCustomFieldActions({}, 'tiktok-channel-type', { warehouseId: 'w1' })
    ).toEqual([
      {
        setCustomType: {
          type: { typeId: 'type', key: 'tiktok-channel-type' },
          fields: [{ name: 'warehouseId', value: '"w1"' }],
        },
      },
    ]);
  });
});
