'use client'

import Link from 'next/link'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { format, differenceInCalendarDays } from 'date-fns'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TABLE_HEADER_STICKY } from '@/components/ui/table-header-classname'
import { MonthRoutedListShell } from '@/components/month-routed-list-shell'
import { DataTableSkeleton } from '@/components/ui/data-table-skeleton'
import { DeleteCoverageButton } from '@/components/coverage/delete-coverage-button'
import { ListPageScrollRoot, ScrollableTableRegion } from '@/components/layout/list-page-layout'
import { useClientMonth } from '@/hooks/use-client-month'
import { getErrorMessageFromResponse } from '@/lib/api-client'

type CoverageRow = {
  id: string
  dateFrom: string
  dateTo: string
  ratePerDay: number
  absentEmployee: { name: string }
  coveringEmployee: { name: string }
  counter: { name: string }
  createdBy: { name: string }
}

export function CoveragePageClient({ initialMonthParam }: { initialMonthParam?: string }) {
  const { month, monthParam, onMonthChange } = useClientMonth(initialMonthParam, '/coverage')

  const { data: coverages = [], isPending, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['coverage', monthParam] as const,
    queryFn: async () => {
      const res = await fetch(`/api/coverage?month=${monthParam}`, { credentials: 'include' })
      if (!res.ok) throw new Error(await getErrorMessageFromResponse(res) || 'Failed to load coverage')
      return res.json() as Promise<CoverageRow[]>
    },
    placeholderData: keepPreviousData,
  })

  return (
    <ListPageScrollRoot>
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Coverage</h1>
          <p className="text-muted-foreground">Shift coverage and substitutions by month</p>
        </div>
        <Button render={<Link href="/coverage/new" />}>
          <Plus className="mr-2 h-4 w-4" />
          Add Coverage
        </Button>
      </div>

      <MonthRoutedListShell
        className="min-h-0 flex-1"
        month={month}
        onMonthChange={onMonthChange}
        isFetching={isPending || (isFetching && coverages.length === 0)}
        pendingTable={(
          <DataTableSkeleton
            border
            className="w-full"
            columns={10}
            actionColumn
            numericColumnIndices={[6, 7]}
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
        ) : coverages.length === 0 ? (
          <p className="shrink-0 text-muted-foreground text-sm">No coverage recorded for this month.</p>
        ) : (
          <ScrollableTableRegion>
            <Table>
              <TableHeader className={TABLE_HEADER_STICKY}>
                <TableRow>
                  <TableHead>Absent</TableHead>
                  <TableHead>Covered by</TableHead>
                  <TableHead>Counter</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead className="text-right">Rate/day</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Recorded by</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {coverages.map((c) => {
                  const days = differenceInCalendarDays(new Date(c.dateTo), new Date(c.dateFrom)) + 1
                  const total = days * c.ratePerDay
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.absentEmployee.name}</TableCell>
                      <TableCell>{c.coveringEmployee.name}</TableCell>
                      <TableCell className="text-muted-foreground">{c.counter.name}</TableCell>
                      <TableCell>{format(new Date(c.dateFrom), 'dd MMM')}</TableCell>
                      <TableCell>{format(new Date(c.dateTo), 'dd MMM')}</TableCell>
                      <TableCell>{days}</TableCell>
                      <TableCell className="text-right">{Math.round(c.ratePerDay).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-medium">{Math.round(total).toLocaleString()}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{c.createdBy.name}</TableCell>
                      <TableCell>
                        <DeleteCoverageButton id={c.id} />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </ScrollableTableRegion>
        )}
      </MonthRoutedListShell>
    </ListPageScrollRoot>
  )
}
