// src/components/ui/data-table-skeleton.tsx
import { TableRow, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

interface DataTableSkeletonProps {
  columnCount?: number;
  rowCount?: number;
  showCheckbox?: boolean;
  showAvatar?: boolean;
  showMainContent?: boolean;
  showActionColumn?: boolean;
}

/**
 * Content-shaped skeleton rows for the md+ half of a data table. Rendered
 * inside <TableBody>; the mobile half uses SkeletonRowCards (table-bits).
 */
export function DataTableSkeleton({
  columnCount = 5,
  rowCount = 10,
  showCheckbox = true,
  showAvatar = false,
  showMainContent = true,
  showActionColumn = true,
}: DataTableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rowCount }).map((_, rowIndex) => (
        <TableRow key={`skeleton-row-${rowIndex}`}>
          {Array.from({ length: columnCount }).map((_, colIndex) => (
            <TableCell
              key={`cell-${rowIndex}-${colIndex}`}
              className="whitespace-nowrap"
            >
              {renderCellContent(
                colIndex,
                columnCount,
                showCheckbox,
                showAvatar,
                showMainContent,
                showActionColumn,
              )}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

/** Shapes each cell by its column position (checkbox, avatar, title, ...). */
function renderCellContent(
  colIndex: number,
  columnCount: number,
  showCheckbox: boolean,
  showAvatar: boolean,
  showMainContent: boolean,
  showActionColumn: boolean,
) {
  if (colIndex === 0 && showCheckbox) {
    return <Skeleton className="h-4 w-4 rounded" />;
  }

  const adjustedIndex = showCheckbox ? colIndex : colIndex + 1;

  if (adjustedIndex === 1 && showAvatar) {
    return <Skeleton className="h-10 w-10 rounded-full" />;
  }

  if (adjustedIndex === 1 + (showAvatar ? 1 : 0) && showMainContent) {
    return (
      <div className="min-w-0 space-y-2">
        <Skeleton className="h-4 w-full max-w-[180px]" />
        <Skeleton className="h-3 w-2/3 max-w-[120px]" />
      </div>
    );
  }

  if (colIndex === columnCount - 1 && showActionColumn) {
    return (
      <div className="flex justify-end">
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
    );
  }

  const widths = ['w-16', 'w-24', 'w-20', 'w-28', 'w-32'];
  const widthClass = widths[colIndex % widths.length];

  if ((adjustedIndex + 1) % 4 === 0) {
    return <Skeleton className={`h-6 ${widthClass} rounded-full opacity-80`} />;
  }

  return <Skeleton className={`h-4 ${widthClass}`} />;
}
