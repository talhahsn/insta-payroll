'use client'

import { useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { MonthNav } from '@/components/month-nav'
import { Button } from '@/components/ui/button'
import { PayrollTableSkeleton } from '@/components/payroll/payroll-table-skeleton'

type ViewType = 'LIVE' | 'EXPECTED'

export function PayrollShell({
  month,
  monthParam,
  viewType,
  table,
  summary = null,
  isTableEmpty = false,
  tableContainerClassName,
}: {
  month: Date
  monthParam: string
  viewType: ViewType
  /** Main grid: table or empty message (server-rendered). */
  table: ReactNode
  /** Summary row(s) below the scroll area (e.g. totals). */
  summary?: ReactNode
  /** When true, table area is short (no tall scroll region). */
  isTableEmpty?: boolean
  /** Override scroll/border wrapper (e.g. client table owns layout). */
  tableContainerClassName?: string
}) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const monthStr = monthParam || format(month, 'yyyy-MM')

  function go(href: string) {
    startTransition(() => {
      router.push(href)
    })
  }

  const scrollRegionClass =
    tableContainerClassName ??
    (isTableEmpty
      ? 'shrink-0 rounded-md border p-4'
      : 'min-h-0 flex-1 overflow-auto overscroll-contain rounded-md border bg-card')

  return (
    <div className="flex h-0 min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <div className="flex shrink-0 items-center justify-between">
        <MonthNav
          month={month}
          transition={{ isPending, startTransition }}
        />
        <div className="flex gap-1 rounded-lg border p-1">
          <Button
            type="button"
            variant={viewType === 'LIVE' ? 'default' : 'ghost'}
            size="sm"
            disabled={isPending}
            onClick={() => go(`/payroll?${new URLSearchParams({ month: monthStr, view: 'LIVE' }).toString()}`)}
          >
            Live
          </Button>
          <Button
            type="button"
            variant={viewType === 'EXPECTED' ? 'default' : 'ghost'}
            size="sm"
            disabled={isPending}
            onClick={() => go(`/payroll?${new URLSearchParams({ month: monthStr, view: 'EXPECTED' }).toString()}`)}
          >
            Expected
          </Button>
        </div>
      </div>

      <div className="flex h-0 min-h-0 flex-1 flex-col gap-1.5">
        <div
          className={scrollRegionClass}
          role={isPending ? 'status' : undefined}
          aria-busy={isPending}
          aria-label={isPending ? 'Loading payroll' : undefined}
        >
          {isPending ? <PayrollTableSkeleton /> : table}
        </div>
        {summary ? <div className="shrink-0">{summary}</div> : null}
      </div>
    </div>
  )
}
