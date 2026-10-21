import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useDebouncedValue } from './useDebouncedValue';

/**
 * State for a filtered, paginated list kept in the URL query string, so lists can
 * be bookmarked and survive reloads. The search box updates the URL once typing
 * pauses; changing a filter or the search resets to page 1.
 */
export function useListParams() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('search') ?? '');
  const debouncedSearch = useDebouncedValue(search.trim());

  /** Sets (or, for empty values, removes) query parameters without adding history entries. */
  const updateParams = useCallback(
    (changes: Record<string, string | undefined>) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(changes)) {
            if (value) next.set(key, value);
            else next.delete(key);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const appliedSearch = params.get('search') ?? '';
  useEffect(() => {
    if (debouncedSearch !== appliedSearch) {
      updateParams({ search: debouncedSearch || undefined, page: undefined });
    }
  }, [debouncedSearch, appliedSearch, updateParams]);

  return {
    params,
    updateParams,
    /** Current page, at least 1. */
    page: Math.max(1, Number(params.get('page')) || 1),
    setPage: (page: number) => updateParams({ page: page > 1 ? String(page) : undefined }),
    /** Text in the search box (updates immediately). */
    search,
    setSearch,
    /** Search applied to the query (from the URL, debounced). */
    appliedSearch: appliedSearch || undefined,
  };
}
