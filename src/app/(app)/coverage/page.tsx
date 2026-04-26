import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { CoverageListPageSkeleton } from '@/components/loading/table-page-skeletons'
import { format, differenceInCalendarDays, startOfMonth, endOfMonth } from 'date-fns'
import { Plus } from 'lucide-react'
import { parseMonthFromQuery } from '@/lib/month-query'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
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

export default function CoveragePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  return (
    <Suspense fallback={<CoverageListPageSkeleton />}>
      <CoveragePageContent searchParams={searchParams} />
    </Suspense>
  )
}

async function CoveragePageContent({
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

  const coverages = await prisma.shiftCoverage.findMany({
    where: {
      absentEmployee: { restaurantId: dbUser.restaurantId },
      dateFrom: { gte: startOfMonth(month) },
      dateTo: { lte: endOfMonth(month) },
    },
    include: {
      absentEmployee: { select: { id: true, name: true } },
      coveringEmployee: { select: { id: true, name: true } },
      counter: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { dateFrom: 'desc' },
  })

  function coverageDays(dateFrom: Date, dateTo: Date) {
    return differenceInCalendarDays(dateTo, dateFrom) + 1
  }

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
        {coverages.length === 0 ? (
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
                  const days = coverageDays(c.dateFrom, c.dateTo)
                  const total = days * c.ratePerDay
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.absentEmployee.name}</TableCell>
                      <TableCell>{c.coveringEmployee.name}</TableCell>
                      <TableCell className="text-muted-foreground">{c.counter.name}</TableCell>
                      <TableCell>{format(c.dateFrom, 'dd MMM')}</TableCell>
                      <TableCell>{format(c.dateTo, 'dd MMM')}</TableCell>
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
