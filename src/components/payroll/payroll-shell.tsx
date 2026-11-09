'use client'

import { useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
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
  onMonthChange,
  onViewChange,
}: {
  month: Date
  monthParam: string
  viewType: ViewType
  /** Main grid: table or empty message. */
  table: ReactNode
  /** Summary row(s) below the scroll area (e.g. totals). */
  summary?: ReactNode
  /** When true, table area is short (no tall scroll region). */
  isTableEmpty?: boolean
  /** Override scroll/border wrapper (e.g. client table owns layout). */
  tableContainerClassName?: string
  /** Client-owned month (no RSC remount). */
  onMonthChange?: (month: Date) => void
  /** Client-owned LIVE/EXPECTED toggle. */
  onViewChange?: (view: ViewType) => void
}) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const clientOwned = Boolean(onMonthChange && onViewChange)

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

  // RSC path still uses transition + skeleton; client-owned path lets React Query handle pending UI.
  const showShellSkeleton = !clientOwned && isPending

  return (
    <div className="flex h-0 min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <div className="flex shrink-0 items-center justify-between">
        <MonthNav
          month={month}
          transition={clientOwned ? undefined : { isPending, startTransition }}
          onMonthChange={onMonthChange}
        />
        <div className="flex gap-1 rounded-lg border p-1">
          <Button
            type="button"
            variant={viewType === 'LIVE' ? 'default' : 'ghost'}
            size="sm"
            disabled={!clientOwned && isPending}
            onClick={() => {
              if (onViewChange) {
                onViewChange('LIVE')
                return
              }
              go(`/payroll?${new URLSearchParams({ month: monthParam, view: 'LIVE' }).toString()}`)
            }}
          >
            Live
          </Button>
          <Button
            type="button"
            variant={viewType === 'EXPECTED' ? 'default' : 'ghost'}
            size="sm"
            disabled={!clientOwned && isPending}
            onClick={() => {
              if (onViewChange) {
                onViewChange('EXPECTED')
                return
              }
              go(`/payroll?${new URLSearchParams({ month: monthParam, view: 'EXPECTED' }).toString()}`)
            }}
          >
            Expected
          </Button>
        </div>
      </div>

      <div className="flex h-0 min-h-0 flex-1 flex-col gap-1.5">
        <div
          className={scrollRegionClass}
          role={showShellSkeleton ? 'status' : undefined}
          aria-busy={showShellSkeleton}
          aria-label={showShellSkeleton ? 'Loading payroll' : undefined}
        >
          {showShellSkeleton ? <PayrollTableSkeleton /> : table}
        </div>
        {summary ? <div className="shrink-0">{summary}</div> : null}
      </div>
    </div>
  )
}
