'use client'

import Link from 'next/link'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { format, differenceInCalendarDays } from 'date-fns'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { DeleteLeaveButton } from '@/components/leaves/delete-leave-button'
import { ListPageScrollRoot, ScrollableTableRegion } from '@/components/layout/list-page-layout'
import { useClientMonth } from '@/hooks/use-client-month'
import { getErrorMessageFromResponse } from '@/lib/api-client'

type LeaveRow = {
  id: string
  dateFrom: string
  dateTo: string
  isHalfDay: boolean
  notes: string | null
  employee: { id: string; name: string }
  createdBy: { name: string }
}

function displayDays(dateFrom: string, dateTo: string, isHalfDay: boolean) {
  if (isHalfDay) return '0.5'
  return String(differenceInCalendarDays(new Date(dateTo), new Date(dateFrom)) + 1)
}

export function LeavesPageClient({ initialMonthParam }: { initialMonthParam?: string }) {
  const { month, monthParam, onMonthChange } = useClientMonth(initialMonthParam, '/leaves')

  const { data: leaves = [], isPending, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['leaves', monthParam] as const,
    queryFn: async () => {
      const res = await fetch(`/api/leaves?month=${monthParam}`, { credentials: 'include' })
      if (!res.ok) throw new Error(await getErrorMessageFromResponse(res) || 'Failed to load leaves')
      return res.json() as Promise<LeaveRow[]>
    },
    placeholderData: keepPreviousData,
  })

  return (
    <ListPageScrollRoot>
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leaves</h1>
          <p className="text-muted-foreground">Track employee leave for each month</p>
        </div>
        <Button render={<Link href="/leaves/new" />}>
          <Plus className="mr-2 h-4 w-4" />
          Add Leave
        </Button>
      </div>

      <MonthRoutedListShell
        className="min-h-0 flex-1"
        month={month}
        onMonthChange={onMonthChange}
        isFetching={isPending || (isFetching && leaves.length === 0)}
        pendingTable={<DataTableSkeleton border className="w-full" columns={8} actionColumn />}
      >
        {isError ? (
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : 'Failed to load.'}{' '}
            <Button type="button" variant="link" className="h-auto p-0" onClick={() => refetch()}>
              Retry
            </Button>
          </p>
        ) : leaves.length === 0 ? (
          <p className="shrink-0 text-muted-foreground text-sm">No leaves recorded for this month.</p>
        ) : (
          <ScrollableTableRegion>
            <Table>
              <TableHeader className={TABLE_HEADER_STICKY}>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Recorded by</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaves.map((leave) => (
                  <TableRow key={leave.id}>
                    <TableCell className="font-medium">{leave.employee.name}</TableCell>
                    <TableCell>{format(new Date(leave.dateFrom), 'dd MMM')}</TableCell>
                    <TableCell>{format(new Date(leave.dateTo), 'dd MMM')}</TableCell>
                    <TableCell>{displayDays(leave.dateFrom, leave.dateTo, leave.isHalfDay)}</TableCell>
                    <TableCell>
                      <Badge variant={leave.isHalfDay ? 'secondary' : 'outline'}>
                        {leave.isHalfDay ? 'Half' : 'Full'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {leave.notes ?? '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {leave.createdBy.name}
                    </TableCell>
                    <TableCell>
                      <DeleteLeaveButton id={leave.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollableTableRegion>
        )}
      </MonthRoutedListShell>
    </ListPageScrollRoot>
  )
}
