import { TtlCache } from './ttl-cache';

describe('TtlCache', () => {
  it('returns values until they expire', () => {
    let now = 1000;
    const cache = new TtlCache<string>(100, () => now);
    cache.set('a', 'x');
    expect(cache.get('a')).toBe('x');
    now = 1099;
    expect(cache.get('a')).toBe('x');
    now = 1100;
    expect(cache.get('a')).toBeUndefined();
  });

  it('shares one in-flight load between concurrent callers', async () => {
    const cache = new TtlCache<number>(1000);
    const load = jest.fn().mockResolvedValue(42);
    const [a, b] = await Promise.all([
      cache.getOrLoad('k', load),
      cache.getOrLoad('k', load),
    ]);
    expect([a, b]).toEqual([42, 42]);
    expect(load).toHaveBeenCalledTimes(1);
    await cache.getOrLoad('k', load);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('does not cache failed loads', async () => {
    const cache = new TtlCache<number>(1000);
    const load = jest
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(1);
    await expect(cache.getOrLoad('k', load)).rejects.toThrow('boom');
    await expect(cache.getOrLoad('k', load)).resolves.toBe(1);
  });

  it('supports delete and clear', () => {
    const cache = new TtlCache<number>(1000);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.delete('a');
    expect(cache.get('a')).toBeUndefined();
    cache.clear();
    expect(cache.get('b')).toBeUndefined();
  });
});
