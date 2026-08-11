// src/components/ui/data-table-pagination.tsx
'use client';

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

  return (
    <div className="flex items-center justify-between gap-2 border bg-background px-3 py-2.5 text-sm text-muted-foreground sm:px-4">
      <div className="flex flex-none items-center gap-2">
        <label htmlFor="page-size" className="hidden whitespace-nowrap sm:inline">
          Rows
        </label>
        <Select
          value={pageSize.toString()}
          onValueChange={(value) => onPageSizeChange?.(Number(value))}
        >
          <SelectTrigger
            id="page-size"
            aria-label="Rows per page"
            className="h-8 w-auto min-w-15"
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
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange?.(Math.max(1, page - 1))}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
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
