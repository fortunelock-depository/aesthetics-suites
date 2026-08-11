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
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CheckSquare,
  Database,
} from 'lucide-react';

interface ITablePaginationProps<TData> {
  table: Table<TData>;
  totalCount: number;
  page: number;
  pageSize: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export function DataTablePagination<TData>({
  table,
  totalCount,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: ITablePaginationProps<TData>) {
  const selectedCount = table.getSelectedRowModel().rows.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalCount);
  const isSelected = selectedCount > 0;

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 rounded-md border bg-background px-4 py-3 text-sm text-muted-foreground sm:px-6 lg:justify-between">
      {/* Stats section - wraps naturally. */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-primary/10">
            {isSelected ? (
              <CheckSquare className="h-4 w-4 text-primary" />
            ) : (
              <Database className="h-4 w-4 text-primary/70" />
            )}
          </div>

          <div className="whitespace-nowrap text-sm text-muted-foreground">
            {isSelected ? (
              <>
                <span className="mr-1 font-semibold text-foreground">
                  {selectedCount.toLocaleString()}
                </span>
                <span className="hidden lg:inline">rows selected | </span>
                <span className="lg:hidden">selected / </span>
                <span className="mr-1 font-semibold text-foreground">
                  {totalCount.toLocaleString()}
                </span>
                <span className="hidden lg:inline"> total</span>
              </>
            ) : (
              <>
                <span className="mr-1 font-semibold text-foreground">
                  {totalCount.toLocaleString()}
                </span>
                <span className="hidden lg:inline"> total rows</span>
                <span className="lg:hidden">rows</span>
              </>
            )}
          </div>
        </div>

        {/* Page-size selector */}
        <div className="flex items-center gap-2.5">
          <label
            htmlFor="page-size"
            className="whitespace-nowrap text-sm font-medium text-muted-foreground"
          >
            <span className="hidden xl:inline">Rows per page</span>
            <span className="inline xl:hidden">Rows</span>
          </label>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => onPageSizeChange?.(Number(value))}
          >
            <SelectTrigger id="page-size" className="h-8 w-auto min-w-15">
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
      </div>

      {/* Navigation section - wraps naturally. */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <span className="whitespace-nowrap text-sm font-medium">
          <span className="hidden xl:inline">Showing </span>
          <span className="font-semibold text-foreground">
            {startItem.toLocaleString()}
          </span>
          -
          <span className="font-semibold text-foreground">
            {endItem.toLocaleString()}
          </span>
          <span className="hidden lg:inline"> of </span>
          <span className="lg:hidden">/</span>
          <span className="ml-1 font-semibold text-foreground">
            {totalCount.toLocaleString()}
          </span>
        </span>

        <nav
          className="flex items-center gap-0.5"
          aria-label="Pagination navigation"
        >
          <Button
            variant="outline"
            size="icon"
            className="hidden h-8 w-8 rounded-r-none border-r-0 md:flex"
            onClick={() => onPageChange?.(1)}
            disabled={page <= 1}
            aria-label="Go to first page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-r-none border-r-0 md:rounded-none"
            onClick={() => onPageChange?.(Math.max(1, page - 1))}
            disabled={page <= 1}
            aria-label="Go to previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <span className="hidden whitespace-nowrap px-3 text-sm font-semibold text-foreground lg:inline">
            Page {page}
          </span>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-l-none border-l-0 md:rounded-none"
            onClick={() => onPageChange?.(page + 1)}
            disabled={page >= totalPages}
            aria-label="Go to next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="hidden h-8 w-8 rounded-l-none md:flex"
            onClick={() => onPageChange?.(totalPages)}
            disabled={page >= totalPages}
            aria-label="Go to last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </nav>
      </div>
    </div>
  );
}
