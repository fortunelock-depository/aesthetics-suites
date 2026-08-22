// src/hooks/use-table-query-state.ts
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  buildTableQueryParams,
  filtersEqual,
  isDefaultTableState,
  parseFiltersFromParams,
  parsePositiveIntParam,
  serializeTableState,
  type ISearchParamsReader,
  type TableFilterValue,
  type TableFiltersSpec,
} from '@/hooks/table-query-state-logic';

export interface IUseTableQueryStateOptions<
  TFilters extends Record<string, TableFilterValue>,
> {
  /** Declares every filter key the page supports and how it (de)serializes. */
  spec: TableFiltersSpec<TFilters>;
  defaultPageSize?: number;
  /**
   * Namespaces this table's URL params and session-memory key when several
   * tables share a pathname: `page` becomes `<prefix>_page` and only the
   * prefixed params are read/written, so two tables never clobber each
   * other's state.
   */
  prefix?: string;
  /** Smooth-scroll to the top on page change (the list-page default). */
  scrollToTopOnPageChange?: boolean;
}

/**
 * Owns a list page's URL-synced table state: page, pageSize and typed
 * filters.
 *
 * - initial state parsed from the URL (shareable/refresh-safe links)
 * - state -> URL sync via router.replace (no history spam, no scroll jump)
 * - page reset on filter/pageSize change, scroll-to-top on page change
 * - `queryParams` with empty values stripped, ready for the RTK Query hook
 * - session memory: re-entering the list through the nav (a bare URL, no
 *   table params) restores the state it was left in; an explicit URL wins
 *   and a fresh browser session starts clean
 */
export const useTableQueryState = <
  TFilters extends Record<string, TableFilterValue>,
>({
  spec,
  defaultPageSize = DEFAULT_PAGE_SIZE,
  prefix,
  scrollToTopOnPageChange = true,
}: IUseTableQueryStateOptions<TFilters>) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /** This table's URL name for a param (`page` -> `<prefix>_page` etc.). */
  const paramName = useCallback(
    (name: string) => (prefix ? `${prefix}_${name}` : name),
    [prefix],
  );
  /** Reads a params object through this table's (possibly prefixed) names. */
  const ownParams = useCallback(
    (params: ISearchParamsReader): ISearchParamsReader => ({
      get: (name) => params.get(paramName(name)),
    }),
    [paramName],
  );

  const [page, setPageState] = useState<number>(() =>
    parsePositiveIntParam(searchParams.get(paramName('page')), DEFAULT_PAGE),
  );
  const [pageSize, setPageSizeState] = useState<number>(() =>
    parsePositiveIntParam(
      searchParams.get(paramName('limit')),
      defaultPageSize,
    ),
  );
  const [filters, setFilters] = useState<TFilters>(() =>
    parseFiltersFromParams(ownParams(searchParams), spec),
  );

  const storageKey = `as-table:${pathname}${prefix ? `:${prefix}` : ''}`;

  /**
   * Session memory: when the page mounts with a bare URL (no table params -
   * e.g. re-entered through the nav), restore the state saved for this
   * pathname earlier in the browser session. Runs in a mount effect, never
   * a useState initializer, because SSR/prerender has no sessionStorage.
   */
  const restoreCheckedRef = useRef(false);
  useEffect(() => {
    if (restoreCheckedRef.current) return;
    restoreCheckedRef.current = true;

    const hasExplicitParams = ['page', 'limit', ...Object.keys(spec)].some(
      (name) => searchParams.get(paramName(name)) !== null,
    );
    if (hasExplicitParams) return;

    /* eslint-disable react-hooks/set-state-in-effect --
       sessionStorage is unreadable during SSR/prerender, so this one-shot
       restore cannot live in a useState initializer; it must run once on
       mount and re-render with the remembered state. */
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (!saved) return;
      const parsed = JSON.parse(saved) as {
        page?: number;
        pageSize?: number;
        filters?: Record<string, string>;
      };
      const restoredFilters = parseFiltersFromParams(
        { get: (name) => parsed.filters?.[name] ?? null },
        spec,
      );
      setPageState(parsePositiveIntParam(String(parsed.page ?? ''), DEFAULT_PAGE));
      setPageSizeState(
        parsePositiveIntParam(String(parsed.pageSize ?? ''), defaultPageSize),
      );
      setFilters(restoredFilters);
    } catch {
      // Corrupt storage never breaks the page.
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** State -> URL + session memory. */
  useEffect(() => {
    const entries = serializeTableState({ page, pageSize, filters }, spec, defaultPageSize);

    const next = new URLSearchParams(searchParams.toString());
    // Remove all of our params, then re-add the live ones.
    for (const name of ['page', 'limit', ...Object.keys(spec)]) {
      next.delete(paramName(name));
    }
    for (const [name, value] of Object.entries(entries)) {
      next.set(paramName(name), value);
    }

    const nextQuery = next.toString();
    if (nextQuery !== searchParams.toString()) {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
        scroll: false,
      });
    }

    try {
      if (isDefaultTableState({ page, pageSize, filters }, defaultPageSize)) {
        sessionStorage.removeItem(storageKey);
      } else {
        sessionStorage.setItem(
          storageKey,
          JSON.stringify({
            page,
            pageSize,
            filters: serializeTableState(
              { page: DEFAULT_PAGE, pageSize: defaultPageSize, filters },
              spec,
              defaultPageSize,
            ),
          }),
        );
      }
    } catch {
      // Storage may be unavailable (private mode); URL sync still works.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, filters]);

  const setPage = useCallback(
    (next: number) => {
      setPageState(Math.max(1, next));
      if (scrollToTopOnPageChange && typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [scrollToTopOnPageChange],
  );

  const setPageSize = useCallback((next: number) => {
    setPageSizeState(Math.max(1, next));
    setPageState(DEFAULT_PAGE);
  }, []);

  /** Patches filters; any change resets to page 1. */
  const patchFilters = useCallback(
    (patch: Partial<TFilters>) => {
      setFilters((current) => {
        const next = { ...current, ...patch };
        if (filtersEqual(current, next)) return current;
        setPageState(DEFAULT_PAGE);
        return next;
      });
    },
    [],
  );

  const queryParams = useMemo(
    () => buildTableQueryParams({ page, pageSize, filters }),
    [page, pageSize, filters],
  );

  return {
    page,
    pageSize,
    filters,
    setPage,
    setPageSize,
    patchFilters,
    queryParams,
  };
};
