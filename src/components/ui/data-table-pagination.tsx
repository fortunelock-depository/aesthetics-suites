// src/components/ui/data-table-pagination.tsx
'use client';

import * as React from 'react';
import { Table } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ITablePaginationProps<TData> {
  /** Unused - kept so call sites don't churn. */
  table?: Table<TData>;
  totalCount: number;
  page: number;
  pageSize: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

/**
 * Deliberately minimal: page size, "x-y of z", previous/next. ONE row at
 * every width - compact controls instead of stacking on phones.
 */
export function DataTablePagination<TData>({
  totalCount,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: ITablePaginationProps<TData>) {
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const startItem = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalCount);

  // useId keeps the label/select pairing unique when two tables share a
  // page (a hardcoded id would silently associate with the first one).
  const pageSizeId = React.useId();
  return (
    <div className="flex items-center justify-between gap-2 border bg-background px-3 py-2.5 text-sm text-muted-foreground sm:px-4">
      <div className="flex flex-none items-center gap-2">
        <label
          htmlFor={pageSizeId}
          className="hidden whitespace-nowrap sm:inline"
        >
          Rows
        </label>
        <Select
          value={pageSize.toString()}
          onValueChange={(value) => onPageSizeChange?.(Number(value))}
        >
          <SelectTrigger
            id={pageSizeId}
            aria-label="Rows per page"
            // The 32px box is the design; the tappable area is not. A
            // transparent pseudo-element grows the hit target past 44px
            // without moving anything, vertically only here since the
            // trigger is already wider than 44px. The 8px reaches into the
            // bar's own 10px of padding, so nothing outside is covered.
            className="relative h-8 w-auto min-w-15 before:absolute before:-inset-y-2 before:inset-x-0 before:content-['']"
          >
            <SelectValue placeholder={pageSize} />
          </SelectTrigger>
          <SelectContent side="top" className="min-w-15">
            {[5, 10, 20, 30, 50, 100].map((size) => (
              <SelectItem key={size} value={size.toString()}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <span className="min-w-0 truncate text-center whitespace-nowrap">
        <span className="font-medium text-foreground">
          {startItem.toLocaleString()}-{endItem.toLocaleString()}
        </span>{' '}
        of {totalCount.toLocaleString()}
      </span>

      <nav
        className="flex flex-none items-center gap-1"
        aria-label="Pagination navigation"
      >
        {/* Same trick, but grown away from the neighbour rather than
            evenly: the pair sits 4px apart, so even growth would make the
            two targets overlap and steal each other's taps. Each takes 2px
            towards its neighbour - meeting exactly in the gap, never past
            it - and the remaining 14px outwards, into padding. */}
        <Button
          variant="outline"
          size="icon"
          className="relative h-8 w-8 before:absolute before:-inset-y-2 before:-left-3.5 before:-right-0.5 before:content-['']"
          onClick={() => onPageChange?.(Math.max(1, page - 1))}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="relative h-8 w-8 before:absolute before:-inset-y-2 before:-left-0.5 before:-right-3.5 before:content-['']"
          onClick={() => onPageChange?.(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </nav>
    </div>
  );
}
