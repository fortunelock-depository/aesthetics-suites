// src/hooks/table-query-state-logic.ts
//
// Pure helpers behind useTableQueryState: the URL <-> state plumbing every
// list page needs (parse searchParams into filters, serialize state back
// into the URL, strip empty values before hitting the API). Keeping it here
// makes it unit-testable without rendering a page and keeps each page down
// to a spec object.

/** The primitive value kinds a table filter can hold in the URL. */
export type TableFilterValue = string | number | boolean | undefined;

export type TableFilterFieldSpec =
  | { kind: 'string' }
  | { kind: 'number' }
  /**
   * `serializeFalse` keeps an explicit `false` in the URL - needed for
   * three-state filters where false and unset mean different things
   * (e.g. isFeatured: featured / not-featured / any).
   */
  | { kind: 'boolean'; serializeFalse?: boolean }
  /** Only values present in `values` survive parsing; garbage in the URL is dropped. */
  | { kind: 'enum'; values: readonly string[] };

/**
 * One entry per filter key the page supports. Keys are mandatory in the spec
 * (`-?`) so adding a field to the filters type forces a decision about how
 * it is (de)serialized.
 */
export type TableFiltersSpec<
  TFilters extends Record<string, TableFilterValue>,
> = {
  [K in keyof TFilters]-?: TableFilterFieldSpec;
};

/** Minimal read surface shared by URLSearchParams and Next's ReadonlyURLSearchParams. */
export interface ISearchParamsReader {
  get(name: string): string | null;
}

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 10;

/** Parses a positive integer URL param, falling back on absent/garbage input. */
export const parsePositiveIntParam = (
  raw: string | null,
  fallback: number,
): number => {
  if (!raw) return fallback;
  const parsed = parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const parseFieldValue = (
  raw: string | null,
  spec: TableFilterFieldSpec,
): TableFilterValue => {
  if (raw === null || raw === '') return undefined;

  switch (spec.kind) {
    case 'string':
      return raw;
    case 'number': {
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    case 'boolean':
      return raw === 'true' ? true : raw === 'false' ? false : undefined;
    case 'enum':
      return spec.values.includes(raw) ? raw : undefined;
  }
};

/** Parses the declared filters out of a URL params reader. */
export const parseFiltersFromParams = <
  TFilters extends Record<string, TableFilterValue>,
>(
  params: ISearchParamsReader,
  spec: TableFiltersSpec<TFilters>,
): TFilters => {
  const filters = {} as Record<string, TableFilterValue>;
  for (const key of Object.keys(spec)) {
    filters[key] = parseFieldValue(params.get(key), spec[key]);
  }
  return filters as TFilters;
};

const serializeFieldValue = (
  value: TableFilterValue,
  spec: TableFilterFieldSpec,
): string | undefined => {
  if (value === undefined || value === '') return undefined;
  if (spec.kind === 'boolean') {
    if (value === false && !spec.serializeFalse) return undefined;
    return String(value);
  }
  return String(value);
};

/**
 * Serializes table state to the URL param entries that should be present.
 * Defaults (page 1, default page size, empty filters) are omitted so a
 * pristine list keeps a clean URL.
 */
export const serializeTableState = <
  TFilters extends Record<string, TableFilterValue>,
>(
  state: { page: number; pageSize: number; filters: TFilters },
  spec: TableFiltersSpec<TFilters>,
  defaultPageSize = DEFAULT_PAGE_SIZE,
): Record<string, string> => {
  const entries: Record<string, string> = {};
  if (state.page !== DEFAULT_PAGE) entries.page = String(state.page);
  if (state.pageSize !== defaultPageSize) {
    entries.limit = String(state.pageSize);
  }
  for (const key of Object.keys(spec)) {
    const serialized = serializeFieldValue(state.filters[key], spec[key]);
    if (serialized !== undefined) entries[key] = serialized;
  }
  return entries;
};

/**
 * The query object for the RTK Query hook: page/limit plus every filter
 * carrying a meaningful value (empty strings and undefined stripped).
 */
export const buildTableQueryParams = <
  TFilters extends Record<string, TableFilterValue>,
>(state: {
  page: number;
  pageSize: number;
  filters: TFilters;
}): { page: number; limit: number } & Partial<TFilters> => {
  const query = { page: state.page, limit: state.pageSize } as {
    page: number;
    limit: number;
  } & Partial<TFilters>;
  for (const [key, value] of Object.entries(state.filters)) {
    if (value === undefined || value === '') continue;
    (query as Record<string, TableFilterValue>)[key] = value;
  }
  return query;
};

export const filtersEqual = <
  TFilters extends Record<string, TableFilterValue>,
>(
  a: TFilters,
  b: TFilters,
): boolean => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (a[key] !== b[key]) return false;
  }
  return true;
};

export const isDefaultTableState = <
  TFilters extends Record<string, TableFilterValue>,
>(
  state: { page: number; pageSize: number; filters: TFilters },
  defaultPageSize = DEFAULT_PAGE_SIZE,
): boolean =>
  state.page === DEFAULT_PAGE &&
  state.pageSize === defaultPageSize &&
  Object.values(state.filters).every(
    (value) => value === undefined || value === '',
  );
