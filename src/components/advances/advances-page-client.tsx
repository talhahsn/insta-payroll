'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MonthRoutedListShell } from '@/components/month-routed-list-shell'
import { DataTableSkeleton } from '@/components/ui/data-table-skeleton'
import { ListPageScrollRoot } from '@/components/layout/list-page-layout'
import { AdvancesListTable, type AdvanceRow } from '@/components/advances/advances-list-table'
import { useClientMonth } from '@/hooks/use-client-month'
import { getErrorMessageFromResponse } from '@/lib/api-client'

type ApiAdvance = {
  id: string
  date: string
  amount: number
  type: 'CASH' | 'FOOD'
  notes: string | null
  employee: { id: string; name: string }
  createdBy: { name: string }
}

export function AdvancesPageClient({ initialMonthParam }: { initialMonthParam?: string }) {
  const { month, monthParam, onMonthChange } = useClientMonth(initialMonthParam, '/advances')

  const { data: advances = [], isPending, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['advances', monthParam] as const,
    queryFn: async () => {
      const res = await fetch(`/api/advances?month=${monthParam}`, { credentials: 'include' })
      if (!res.ok) throw new Error(await getErrorMessageFromResponse(res) || 'Failed to load advances')
      return res.json() as Promise<ApiAdvance[]>
    },
    placeholderData: keepPreviousData,
  })

  const rows: AdvanceRow[] = useMemo(
    () =>
      advances.map((a) => ({
        id: a.id,
        date: typeof a.date === 'string' ? a.date : new Date(a.date).toISOString(),
        amount: a.amount,
        type: a.type,
        notes: a.notes,
        employee: a.employee,
        createdBy: a.createdBy,
      })),
    [advances]
  )

  const cashTotal = rows.filter((a) => a.type === 'CASH').reduce((s, a) => s + a.amount, 0)
  const foodTotal = rows.filter((a) => a.type === 'FOOD').reduce((s, a) => s + a.amount, 0)

  return (
    <ListPageScrollRoot>
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Advances</h1>
          <p className="text-muted-foreground">Cash advances and food expenses by month</p>
        </div>
        <Button render={<Link href="/advances/new" />}>
          <Plus className="mr-2 h-4 w-4" />
          Add Entry
        </Button>
      </div>

      <MonthRoutedListShell
        className="min-h-0 flex-1"
        month={month}
        onMonthChange={onMonthChange}
        isFetching={isPending || (isFetching && rows.length === 0)}
        afterNav={(
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>
              Cash: <strong className="text-foreground">PKR {cashTotal.toLocaleString()}</strong>
            </span>
            <span>
              Food: <strong className="text-foreground">PKR {foodTotal.toLocaleString()}</strong>
            </span>
          </div>
        )}
        pendingTable={(
          <DataTableSkeleton
            border
            className="w-full"
            columns={7}
            actionColumn
            numericColumnIndices={[3]}
          />
        )}
      >
        {isError ? (
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : 'Failed to load.'}{' '}
            <Button type="button" variant="link" className="h-auto p-0" onClick={() => refetch()}>
              Retry
            </Button>
          </p>
        ) : (
          <AdvancesListTable rows={rows} />
        )}
      </MonthRoutedListShell>
    </ListPageScrollRoot>
  )
}
