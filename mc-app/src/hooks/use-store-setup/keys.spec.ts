import { isValidKey, toKey } from './keys';

describe('toKey', () => {
  it('turns a name into a key', () => {
    expect(toKey('TikTok Store')).toBe('tiktok-store');
    expect(toKey('  My  shop / EU  ')).toBe('my-shop-eu');
  });

  it('keeps digits, dashes and underscores', () => {
    expect(toKey('shop_2-b')).toBe('shop_2-b');
  });

  it('is empty when nothing usable is left', () => {
    expect(toKey('商店')).toBe('');
  });
});

describe('isValidKey', () => {
  it.each(['tiktok-store', 'a_b', 'ab', 'A1'])('accepts %s', (key) => {
    expect(isValidKey(key)).toBe(true);
  });

  it.each(['', 'a', 'has space', 'ü-key', 'a/b'])('rejects %s', (key) => {
    expect(isValidKey(key)).toBe(false);
  });
});
