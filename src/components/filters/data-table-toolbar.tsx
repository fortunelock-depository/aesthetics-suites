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
import { useIsBelowLg } from '@/hooks/use-breakpoint';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { cn } from '@/lib/utils';

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
   * Filter controls for multi-filter tables: rendered in the desktop inline
   * panel and the mobile bottom sheet (behind the filter toggle). Omit for
   * search-only tables.
   */
  filterFields?: React.ReactNode;
  /** Active (non-search) filter count shown as a badge on the toggle. */
  filterCount?: number;
  /** Whether any filter is applied - drives the highlight and clear-all. */
  hasFiltersApplied?: boolean;
  onClearAll?: () => void;
  /** Show the column-visibility menu (desktop only). Defaults to true. */
  showColumns?: boolean;
  /** Grid layout classes for the desktop inline filter panel. */
  panelClassName?: string;
}

/**
 * Shared toolbar for every admin data table.
 *
 * - Search box takes the available width; the filter toggle is icon-only on
 *   phones and gains a label from `sm` upward.
 * - `filterFields` open as an inline panel on `lg+` and a bottom sheet
 *   below `lg` - desktop-spread filter rows never just wrap on mobile.
 * - The column-visibility menu is hidden below `lg`.
 */
export function DataTableToolbar<TData>({
  table,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search…',
  filterFields,
  filterCount = 0,
  hasFiltersApplied = false,
  onClearAll,
  showColumns = true,
  panelClassName = 'lg:grid-cols-4',
}: IDataTableToolbarProps<TData>) {
  const [showFilters, setShowFilters] = React.useState(false);
  const isBelowLg = useIsBelowLg();

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

  const filterToggle = filterFields ? (
    <Button
      variant="outline"
      onClick={() => setShowFilters((v) => !v)}
      aria-expanded={showFilters}
      className={cn('gap-1.5', filterCount > 0 && 'border-brand/50')}
    >
      <SlidersHorizontal className="h-4 w-4" />
      <span className="hidden sm:inline">Filters</span>
      {filterCount > 0 && (
        <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
          {filterCount}
        </Badge>
      )}
      <ChevronDown
        className={cn(
          'hidden h-3.5 w-3.5 transition-transform sm:block',
          showFilters && 'rotate-180',
        )}
      />
    </Button>
  ) : null;

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
            panelClassName,
          )}
        >
          {filterFields}
        </div>
      )}

      {filterFields && (
        <Dialog.Root
          open={showFilters && isBelowLg}
          onOpenChange={setShowFilters}
        >
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
              <div className="grid gap-3">{filterFields}</div>
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
