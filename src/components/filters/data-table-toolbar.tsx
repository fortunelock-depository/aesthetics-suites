// src/components/filters/data-table-toolbar.tsx
'use client';

import * as React from 'react';
import { Table } from '@tanstack/react-table';
import { Dialog } from 'radix-ui';
import { ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useIsBelowLg, useIsBelowSm } from '@/hooks/use-breakpoint';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { cn } from '@/lib/utils';

/**
 * Panel grid: 2 columns on phones, 3 on tablets; on desktop
 * fewer than 4 filters sit in a 4-col grid filling from the left, while
 * 4-7 filters all share ONE row (grid-cols-n). Literal classes so
 * Tailwind can see them; no page has 8+ filters.
 */
function panelGridClasses(count: number): string {
  const desktop =
    {
      5: 'lg:grid-cols-5',
      6: 'lg:grid-cols-6',
      7: 'lg:grid-cols-7',
    }[count] ?? 'lg:grid-cols-4';
  return `grid-cols-2 md:grid-cols-3 ${desktop}`;
}

interface IDataTableToolbarProps<TData> {
  /** Omit on tables without a column-visibility menu. */
  table?: Table<TData>;
  /** The currently applied search term (e.g. `filters.search ?? ""`). */
  searchValue: string;
  /**
   * Called with the debounced search term (empty string when cleared). The
   * parent maps it to its query, e.g.
   * `patchFilters({ search: v || undefined })`.
   */
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  /**
   * Filter controls for MULTI-filter tables (2+): rendered in the desktop
   * inline panel behind the Filters toggle, and the mobile bottom sheet.
   * Mutually exclusive with `inlineFilter`.
   */
  filterFields?: React.ReactNode;
  /**
   * How many controls `filterFields` holds - drives the panel grid (see
   * panelGridClasses). Required when `filterFields` is set.
   */
  filterFieldCount?: number;
  /**
   * A SINGLE filter control: shown inline beside the search box from `sm`
   * up (no Filters toggle), collapsed behind the mobile-only toggle into
   * the bottom sheet below `sm`. Mutually exclusive with `filterFields`.
   */
  inlineFilter?: React.ReactNode;
  /** Active (non-search) filter count shown as a badge on the toggle. */
  filterCount?: number;
  /** Whether any filter is applied - drives the highlight and clear-all. */
  hasFiltersApplied?: boolean;
  onClearAll?: () => void;
  /** Show the column-visibility menu (desktop only). Defaults to true. */
  showColumns?: boolean;
}

/**
 * Shared toolbar for every admin data table.
 *
 * - Search box takes the available width.
 * - ONE filter (`inlineFilter`) sits beside the search from `sm` up with
 *   no Filters button; 2+ filters (`filterFields`) live behind the toggle
 *   as an inline panel on `lg+` and a bottom sheet below - desktop-spread
 *   filter rows never just wrap on mobile.
 * - The column-visibility menu is hidden below `lg`.
 */
export function DataTableToolbar<TData>({
  table,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search…',
  filterFields,
  filterFieldCount = 0,
  inlineFilter,
  filterCount = 0,
  hasFiltersApplied = false,
  onClearAll,
  showColumns = true,
}: IDataTableToolbarProps<TData>) {
  const [showFilters, setShowFilters] = React.useState(false);
  const isBelowLg = useIsBelowLg();
  const isBelowSm = useIsBelowSm();

  // Owns the search input and debounces commits upward. `lastEmitted` lets
  // us tell our own debounced commits apart from external resets (e.g.
  // "Clear all"), so we only resync the input on the latter - never
  // mid-typing.
  const [searchInput, setSearchInput] = React.useState(searchValue);
  const debouncedSearch = useDebouncedValue(searchInput, 500);
  const lastEmitted = React.useRef(searchValue);

  React.useEffect(() => {
    if (debouncedSearch === lastEmitted.current) return;
    lastEmitted.current = debouncedSearch;
    onSearchChange(debouncedSearch);
  }, [debouncedSearch, onSearchChange]);

  React.useEffect(() => {
    if (searchValue !== lastEmitted.current) {
      lastEmitted.current = searchValue;
      setSearchInput(searchValue);
    }
  }, [searchValue]);

  // A single inline filter only needs the toggle on phones (where it
  // collapses into the sheet); multi-filter tables always have it.
  const filterToggle =
    filterFields || inlineFilter ? (
      <Button
        variant="outline"
        onClick={() => setShowFilters((v) => !v)}
        aria-expanded={showFilters}
        className={cn(
          'gap-1.5',
          filterCount > 0 && 'border-brand/50',
          inlineFilter && !filterFields && 'sm:hidden',
        )}
      >
        <SlidersHorizontal className="h-4 w-4" />
        <span
          className={cn(
            inlineFilter && !filterFields ? 'hidden' : 'hidden sm:inline',
          )}
        >
          Filters
        </span>
        {filterCount > 0 && (
          <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
            {filterCount}
          </Badge>
        )}
        {filterFields && (
          <ChevronDown
            className={cn(
              'hidden h-3.5 w-3.5 transition-transform sm:block',
              showFilters && 'rotate-180',
            )}
          />
        )}
      </Button>
    ) : null;

  const sheetContent = filterFields ?? inlineFilter;
  const sheetOpen =
    showFilters &&
    ((!!filterFields && isBelowLg) ||
      (!!inlineFilter && !filterFields && isBelowSm));

  return (
    <div className="space-y-3">
      {/* Row 1: search always visible and full-width on phones. */}
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-8"
            aria-label="Search"
          />
          {searchInput && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearchInput('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* The lone filter sits beside the search from sm up - no toggle. */}
        {inlineFilter && (
          <div className="hidden w-44 shrink-0 sm:block lg:w-52">
            {inlineFilter}
          </div>
        )}

        {filterToggle}

        {hasFiltersApplied && onClearAll && (
          <Button variant="ghost" onClick={onClearAll} className="hidden sm:flex">
            Clear all
          </Button>
        )}

        {showColumns && table && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="hidden gap-1.5 lg:flex">
                Columns
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                    className="capitalize"
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Filter fields: inline panel on lg+, bottom sheet below. */}
      {filterFields && showFilters && !isBelowLg && (
        <div
          className={cn(
            'grid gap-3 rounded-lg border border-border bg-card p-4',
            panelGridClasses(filterFieldCount),
          )}
        >
          {filterFields}
        </div>
      )}

      {sheetContent && (
        <Dialog.Root open={sheetOpen} onOpenChange={setShowFilters}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 lg:hidden" />
            <Dialog.Content
              className={cn(
                'fixed inset-x-0 bottom-0 z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto rounded-t-2xl border-t border-border bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:hidden',
              )}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <Dialog.Title className="text-sm font-semibold">
                  Filters
                </Dialog.Title>
                <Dialog.Close asChild>
                  <Button variant="ghost" size="icon" aria-label="Close filters">
                    <X className="h-4 w-4" />
                  </Button>
                </Dialog.Close>
              </div>
              <div
                className={cn(
                  'grid gap-3',
                  filterFields && 'grid-cols-2 md:grid-cols-3',
                )}
              >
                {sheetContent}
              </div>
              {hasFiltersApplied && onClearAll && (
                <Button
                  variant="outline"
                  className="mt-4 w-full"
                  onClick={() => {
                    onClearAll();
                    setShowFilters(false);
                  }}
                >
                  Clear all filters
                </Button>
              )}
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </div>
  );
}
