export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
