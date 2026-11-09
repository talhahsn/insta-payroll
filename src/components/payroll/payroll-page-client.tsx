'use client'

import { useCallback, useMemo, useState } from 'react'
import { format, startOfMonth } from 'date-fns'
import { ExportPdfButton } from '@/components/payroll/export-pdf-button'
import { PayrollShell } from '@/components/payroll/payroll-shell'
import { PayrollRosterDataTable } from '@/components/payroll/payroll-roster-data-table'
import { parseMonthFromQuery } from '@/lib/month-query'

type ViewType = 'LIVE' | 'EXPECTED'

function syncPayrollUrl(monthStr: string, viewType: ViewType) {
  const params = new URLSearchParams()
  params.set('month', monthStr)
  params.set('view', viewType)
  const next = `/payroll?${params.toString()}`
  if (typeof window !== 'undefined' && window.location.pathname + window.location.search !== next) {
    window.history.replaceState(window.history.state, '', next)
  }
}

export function PayrollPageClient({
  initialMonthParam,
  initialView,
}: {
  initialMonthParam?: string
  initialView?: string
}) {
  const [month, setMonth] = useState(() => parseMonthFromQuery(initialMonthParam))
  const [viewType, setViewType] = useState<ViewType>(
    initialView === 'EXPECTED' ? 'EXPECTED' : 'LIVE'
  )

  const monthParam = useMemo(() => format(startOfMonth(month), 'yyyy-MM'), [month])

  const handleMonthChange = useCallback(
    (next: Date) => {
      const normalized = startOfMonth(next)
      setMonth(normalized)
      syncPayrollUrl(format(normalized, 'yyyy-MM'), viewType)
    },
    [viewType]
  )

  const handleViewChange = useCallback(
    (next: ViewType) => {
      setViewType(next)
      syncPayrollUrl(monthParam, next)
    },
    [monthParam]
  )

  return (
    <div className="flex h-0 min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <div className="flex shrink-0 items-center justify-between">
        <div className="space-y-0.5 flex w-full min-w-0 items-center gap-2">
          <h1 className="text-xl font-bold leading-tight tracking-tight sm:text-2xl">Payroll</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">Search, sort, and page the roster</p>
        </div>
        <ExportPdfButton
          month={month}
          viewType={viewType}
          monthParam={monthParam}
        />
      </div>

      <PayrollShell
        month={month}
        monthParam={monthParam}
        viewType={viewType}
        onMonthChange={handleMonthChange}
        onViewChange={handleViewChange}
        tableContainerClassName="min-h-0 flex flex-1 flex-col overflow-hidden p-0"
        isTableEmpty={false}
        table={
          <PayrollRosterDataTable
            month={month}
            monthParam={monthParam}
            viewType={viewType}
          />
        }
      />
    </div>
  )
}
