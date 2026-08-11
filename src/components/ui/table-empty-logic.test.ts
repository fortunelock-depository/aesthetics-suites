// src/components/ui/table-empty-logic.test.ts
import { describe, expect, it } from 'vitest';
import {
  clearAllFiltersPatch,
  hasActiveTableFilters,
  isMeaningfulFilterValue,
  tableEmptyMode,
} from './table-empty-logic';

describe('isMeaningfulFilterValue', () => {
  it('ignores undefined, null and blank strings', () => {
    expect(isMeaningfulFilterValue(undefined)).toBe(false);
    expect(isMeaningfulFilterValue(null)).toBe(false);
    expect(isMeaningfulFilterValue('')).toBe(false);
    expect(isMeaningfulFilterValue('   ')).toBe(false);
  });

  it('counts real values, including false and 0', () => {
    expect(isMeaningfulFilterValue('x')).toBe(true);
    expect(isMeaningfulFilterValue(0)).toBe(true);
    expect(isMeaningfulFilterValue(false)).toBe(true);
  });
});

describe('tableEmptyMode', () => {
  it('is null while loading or with rows', () => {
    expect(tableEmptyMode(true, 0, false)).toBeNull();
    expect(tableEmptyMode(false, 3, true)).toBeNull();
  });

  it('distinguishes a truly empty table from a filtered miss', () => {
    expect(tableEmptyMode(false, 0, false)).toBe('no-data');
    expect(tableEmptyMode(false, 0, true)).toBe('filtered-empty');
  });
});

describe('hasActiveTableFilters / clearAllFiltersPatch', () => {
  it('detects any meaningful filter and clears every key', () => {
    const filters = { search: 'ann', role: undefined };
    expect(hasActiveTableFilters(filters)).toBe(true);
    expect(clearAllFiltersPatch(filters)).toEqual({
      search: undefined,
      role: undefined,
    });
  });
});
