import type { PagedResponse } from '../interfaces/commercetools';

/**
 * Fetches every page of a paged commercetools query and returns the aggregated result.
 */
export const fetchAllEntities = async <T>(
  fetchPage: (limit: number, offset: number) => Promise<PagedResponse<T>>,
  limit = 100,
): Promise<PagedResponse<T>> => {
  const results: T[] = [];
  let offset = 0;
  let last: PagedResponse<T>;
  do {
    last = await fetchPage(limit, offset);
    results.push(...last.results);
    offset += last.count;
  } while (last.count > 0 && last.total !== undefined && offset < last.total);
  return { ...last, results, count: results.length, offset: 0 };
};
