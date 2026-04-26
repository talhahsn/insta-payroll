import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AdvancesListPageSkeleton } from '@/components/loading/table-page-skeletons'
import { startOfMonth, endOfMonth } from 'date-fns'
import { Plus } from 'lucide-react'
import { parseMonthFromQuery } from '@/lib/month-query'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { MonthRoutedListShell } from '@/components/month-routed-list-shell'
import { DataTableSkeleton } from '@/components/ui/data-table-skeleton'
import { ListPageScrollRoot } from '@/components/layout/list-page-layout'
import { AdvancesListTable } from '@/components/advances/advances-list-table'

export default function AdvancesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  return (
    <Suspense fallback={<AdvancesListPageSkeleton />}>
      <AdvancesPageContent searchParams={searchParams} />
    </Suspense>
  )
}

async function AdvancesPageContent({
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

  const advances = await prisma.advance.findMany({
    where: {
      employee: { restaurantId: dbUser.restaurantId },
      date: { gte: startOfMonth(month), lte: endOfMonth(month) },
    },
    include: {
      employee: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { date: 'desc' },
  })

  const cashTotal = advances.filter((a) => a.type === 'CASH').reduce((s, a) => s + a.amount, 0)
  const foodTotal = advances.filter((a) => a.type === 'FOOD').reduce((s, a) => s + a.amount, 0)

  const advanceRows = advances.map((a) => ({
    id: a.id,
    date: a.date.toISOString(),
    amount: a.amount,
    type: a.type,
    notes: a.notes,
    employee: a.employee,
    createdBy: a.createdBy,
  }))

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
        <AdvancesListTable rows={advanceRows} />
      </MonthRoutedListShell>
    </ListPageScrollRoot>
  )
}
