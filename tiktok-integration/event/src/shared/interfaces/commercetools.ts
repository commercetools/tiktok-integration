export interface PagedResponse<T> {
  results: T[];
  count: number;
  offset: number;
  total?: number;
  limit: number;
}
