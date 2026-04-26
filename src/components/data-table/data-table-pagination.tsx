'use client'

import type { ReactNode } from 'react'
import { type Table as TTable } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const

/** Default `pageSize` for TanStack `PaginationState` and server-paged APIs. */
export const DEFAULT_TABLE_PAGE_SIZE = 25

type Props<T> = {
  table: TTable<T>
  total: number
  /** Options in the "Rows" dropdown. Defaults to 10 / 25 / 50 / 100. */
  pageSizeOptions?: readonly number[]
  /** Content at the start of the same bar (e.g. inline month totals) — no extra row below. */
  startSlot?: ReactNode
  className?: string
}

export function DataTablePagination<T>({
  table,
  total,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  startSlot,
  className,
}: Props<T>) {
  const { pageIndex, pageSize } = table.getState().pagination
  const pageCount = table.getPageCount()
  const from = total === 0 ? 0 : pageIndex * pageSize + 1
  const to = Math.min((pageIndex + 1) * pageSize, total)

  const sizeStr = String(pageSize)
  const options = pageSizeOptions.includes(pageSize)
    ? [...pageSizeOptions]
    : [...pageSizeOptions, pageSize].sort((a, b) => a - b)

  function onPageSizeChange(v: string | null) {
    if (v == null) return
    const n = parseInt(v, 10)
    if (!Number.isFinite(n) || n < 1) return
    table.setPagination((prev) => ({ ...prev, pageIndex: 0, pageSize: n }))
  }

  const rangeText =
    total === 0 ? '0 results' : `Showing ${from}–${to} of ${total} result${total === 1 ? '' : 's'}`

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-t border-border/80 px-2 py-1.5 text-sm sm:px-3',
        className
      )}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
        {startSlot ? <div className="min-w-0 max-w-full">{startSlot}</div> : null}
        <p
          className={cn(
            'text-muted-foreground tabular-nums',
            startSlot && 'shrink-0 sm:border-l sm:border-border/60 sm:pl-3'
          )}
        >
          {rangeText}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground hidden whitespace-nowrap sm:inline" title="Rows per page">
            Rows
          </span>
          <Select value={sizeStr} onValueChange={onPageSizeChange}>
            <SelectTrigger
              size="sm"
              className="h-7 min-w-16 w-16 shrink-0 cursor-pointer justify-between gap-1 px-2 data-disabled:cursor-not-allowed sm:min-w-[4.5rem] sm:w-[4.5rem]"
              title="Rows per page"
            >
              <SelectValue className="min-w-0 flex-1 text-center font-medium tabular-nums" />
            </SelectTrigger>
            <SelectContent>
              {options.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-sm"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            Prev
          </Button>
          <span className="text-muted-foreground min-w-14 text-center tabular-nums">
            {pageCount === 0 || total === 0 ? '—' : `${pageIndex + 1} / ${pageCount}`}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-sm"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
