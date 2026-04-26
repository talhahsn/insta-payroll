'use client'

import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { tableCompactClassname } from '@/components/ui/table-compact-classname'
import { TABLE_HEADER_STICKY } from '@/components/ui/table-header-classname'

export type DataTableSkeletonProps = {
  /** Total columns, including the action column when `actionColumn` is true */
  columns: number
  rows?: number
  /** Last column is a narrow “actions” placeholder */
  actionColumn?: boolean
  /** 0-based indices of columns that use right-aligned numeric-style skeletons */
  numericColumnIndices?: number[]
  /**
   * Optional header labels (e.g. for transition states). If omitted, each header is a skeleton bar.
   */
  headerLabels?: string[]
  compact?: boolean
  /** Outer `rounded-md border` (most list pages wrap the table this way) */
  border?: boolean
  stickyHeader?: boolean
  className?: string
  tableHeaderClassName?: string
}

function DataCell({
  colIndex,
  columns,
  actionColumn,
  numeric,
}: {
  colIndex: number
  columns: number
  actionColumn: boolean
  numeric: Set<number>
}) {
  const last = actionColumn && colIndex === columns - 1
  if (last) {
    return (
      <TableCell className="w-10">
        <div className="flex justify-end">
          <Skeleton className="h-7 w-8 rounded-md" />
        </div>
      </TableCell>
    )
  }
  if (colIndex === 0) {
    return (
      <TableCell>
        <Skeleton className="h-4 w-32" />
      </TableCell>
    )
  }
  if (numeric.has(colIndex)) {
    return (
      <TableCell className="text-right">
        <Skeleton className="ml-auto h-4 w-14" />
      </TableCell>
    )
  }
  return (
    <TableCell>
      <Skeleton className="h-4 w-24" />
    </TableCell>
  )
}

/**
 * Generic loading state for list pages that use `<Table>`. Use in `loading.tsx`, Suspense fallbacks,
 * or client pending states.
 */
export function DataTableSkeleton({
  columns,
  rows = 8,
  actionColumn = false,
  numericColumnIndices,
  headerLabels,
  compact = false,
  border = false,
  stickyHeader = false,
  className,
  tableHeaderClassName,
}: DataTableSkeletonProps) {
  const numeric = new Set(numericColumnIndices ?? [])
  const labels = headerLabels

  const content = (
    <Table>
      <TableHeader
        className={cn(
          stickyHeader && TABLE_HEADER_STICKY,
          tableHeaderClassName
        )}
      >
        <TableRow>
          {Array.from({ length: columns }, (_, i) => (
            <TableHead
              key={i}
              className={cn(
                i > 0 && numeric.has(i) && 'text-right',
                actionColumn && i === columns - 1 && 'w-10'
              )}
            >
              {labels?.[i] != null && labels[i] !== '' ? (
                <span className="text-muted-foreground">{labels[i]}</span>
              ) : (
                <Skeleton className="h-4 w-20 max-w-full" />
              )}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }, (_, row) => (
          <TableRow key={row} className="hover:bg-transparent">
            {Array.from({ length: columns }, (_, col) => (
              <DataCell
                key={col}
                colIndex={col}
                columns={columns}
                actionColumn={actionColumn}
                numeric={numeric}
              />
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )

  if (border) {
    return (
      <div
        className={cn(
          'w-full min-h-[10rem] rounded-md border border-border/80 bg-card/30',
          compact && tableCompactClassname,
          className
        )}
      >
        {content}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'min-h-[8rem] w-full',
        compact && tableCompactClassname,
        className
      )}
    >
      {content}
    </div>
  )
}

/** Title + subtitle + optional top-right action (matches most list pages). */
export function ListPageHeaderSkeleton({ showAction = true }: { showAction?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      {showAction ? <Skeleton className="h-9 w-28" /> : null}
    </div>
  )
}

/**
 * Placeholder for `MonthNav` + optional month summary chips (e.g. Advances cash/food).
 */
export function MonthNavRowSkeleton({ withSummary = false }: { withSummary?: boolean }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-4',
        withSummary && 'sm:gap-6'
      )}
    >
      <Skeleton className="h-9 w-48 shrink-0 rounded-lg sm:w-56" />
      {withSummary ? (
        <div className="flex flex-wrap gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-32" />
        </div>
      ) : null}
    </div>
  )
}

/** Settings page title block (h1 + description), max-width layouts. */
export function SettingsPageHeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72 max-w-full" />
    </div>
  )
}
