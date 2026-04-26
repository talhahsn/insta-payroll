import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { LeavesListPageSkeleton } from '@/components/loading/table-page-skeletons'
import { format, differenceInCalendarDays, startOfMonth } from 'date-fns'
import { Plus } from 'lucide-react'
import { parseMonthFromQuery } from '@/lib/month-query'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
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

export default function LeavesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  return (
    <Suspense fallback={<LeavesListPageSkeleton />}>
      <LeavesPageContent searchParams={searchParams} />
    </Suspense>
  )
}

async function LeavesPageContent({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const dbUser = await prisma.user.findUnique({ where: { supabaseUid: user.id } })
  if (!dbUser) redirect('/login')

  const { month: monthParam } = await searchParams
  const month = parseMonthFromQuery(monthParam)

  const leaves = await prisma.leave.findMany({
    where: {
      employee: { restaurantId: dbUser.restaurantId },
      dateFrom: { gte: startOfMonth(month) },
      dateTo: { lte: new Date(month.getFullYear(), month.getMonth() + 1, 0) },
    },
    include: {
      employee: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { dateFrom: 'desc' },
  })

  function displayDays(dateFrom: Date, dateTo: Date, isHalfDay: boolean) {
    if (isHalfDay) return '0.5'
    return String(differenceInCalendarDays(dateTo, dateFrom) + 1)
  }

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
        pendingTable={(
          <DataTableSkeleton border className="w-full" columns={8} actionColumn />
        )}
      >
        {leaves.length === 0 ? (
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
                    <TableCell>{format(leave.dateFrom, 'dd MMM')}</TableCell>
                    <TableCell>{format(leave.dateTo, 'dd MMM')}</TableCell>
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
