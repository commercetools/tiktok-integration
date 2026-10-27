import { fetchAllEntities } from './fetch-all';
import { convertPriceToCentAmount } from './currency';

describe('fetchAllEntities', () => {
  it('aggregates every page', async () => {
    const data = [1, 2, 3, 4, 5];
    const fetchPage = jest.fn(async (limit: number, offset: number) => {
      const results = data.slice(offset, offset + limit);
      return {
        results,
        count: results.length,
        offset,
        limit,
        total: data.length,
      };
    });
    const result = await fetchAllEntities(fetchPage, 2);
    expect(result.results).toEqual(data);
    expect(result.count).toBe(5);
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  it('stops when the total is unknown', async () => {
    const fetchPage = jest.fn(async () => ({
      results: [1],
      count: 1,
      offset: 0,
      limit: 10,
    }));
    const result = await fetchAllEntities(fetchPage);
    expect(result.results).toEqual([1]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});

describe('convertPriceToCentAmount', () => {
  it('converts decimal strings and tolerates missing values', () => {
    expect(convertPriceToCentAmount('12.34')).toBe(1234);
    expect(convertPriceToCentAmount('0.1')).toBe(10);
    expect(convertPriceToCentAmount(undefined)).toBe(0);
  });
});
