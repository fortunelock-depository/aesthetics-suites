// src/hooks/table-query-state-logic.test.ts
import { describe, expect, it } from 'vitest';
import {
  buildTableQueryParams,
  filtersEqual,
  isDefaultTableState,
  parseFiltersFromParams,
  parsePositiveIntParam,
  serializeTableState,
  type TableFiltersSpec,
} from './table-query-state-logic';

interface TestFilters extends Record<string, string | boolean | undefined> {
  search?: string;
  role?: string;
  isAdmin?: boolean;
}

const spec: TableFiltersSpec<TestFilters> = {
  search: { kind: 'string' },
  role: { kind: 'enum', values: ['ADMIN', 'MEMBER'] },
  isAdmin: { kind: 'boolean', serializeFalse: true },
};

const reader = (entries: Record<string, string>) => ({
  get: (name: string) => entries[name] ?? null,
});

describe('parsePositiveIntParam', () => {
  it('falls back on garbage, zero and negatives', () => {
    expect(parsePositiveIntParam(null, 1)).toBe(1);
    expect(parsePositiveIntParam('abc', 1)).toBe(1);
    expect(parsePositiveIntParam('0', 1)).toBe(1);
    expect(parsePositiveIntParam('-3', 1)).toBe(1);
    expect(parsePositiveIntParam('4', 1)).toBe(4);
  });
});

describe('parseFiltersFromParams', () => {
  it('parses declared kinds and drops enum garbage', () => {
    const filters = parseFiltersFromParams(
      reader({ search: 'ann', role: 'HACKER', isAdmin: 'false' }),
      spec,
    );
    expect(filters).toEqual({
      search: 'ann',
      role: undefined,
      isAdmin: false,
    });
  });
});

describe('serializeTableState', () => {
  it('omits defaults and keeps explicit false when configured', () => {
    expect(
      serializeTableState(
        { page: 1, pageSize: 10, filters: { search: undefined, role: undefined, isAdmin: false } },
        spec,
      ),
    ).toEqual({ isAdmin: 'false' });

    expect(
      serializeTableState(
        { page: 3, pageSize: 20, filters: { search: 'ann', role: 'ADMIN', isAdmin: undefined } },
        spec,
      ),
    ).toEqual({ page: '3', limit: '20', search: 'ann', role: 'ADMIN' });
  });
});

describe('buildTableQueryParams', () => {
  it('strips empty values and keeps page/limit', () => {
    expect(
      buildTableQueryParams({
        page: 2,
        pageSize: 10,
        filters: { search: '', role: 'ADMIN', isAdmin: undefined },
      }),
    ).toEqual({ page: 2, limit: 10, role: 'ADMIN' });
  });
});

describe('filtersEqual / isDefaultTableState', () => {
  it('compares by key and detects the pristine state', () => {
    expect(
      filtersEqual({ search: 'a', role: undefined }, { search: 'a', role: undefined }),
    ).toBe(true);
    expect(filtersEqual({ search: 'a' }, { search: 'b' })).toBe(false);

    expect(
      isDefaultTableState({ page: 1, pageSize: 10, filters: { search: undefined } }),
    ).toBe(true);
    expect(
      isDefaultTableState({ page: 2, pageSize: 10, filters: { search: undefined } }),
    ).toBe(false);
  });
});
