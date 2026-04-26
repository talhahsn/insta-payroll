import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { PayrollListPageSkeleton } from '@/components/loading/table-page-skeletons'
import { getAuthUser } from '@/lib/auth'
import { parseMonthFromQuery } from '@/lib/month-query'
import { can } from '@/lib/permissions'
import { ExportPdfButton } from '@/components/payroll/export-pdf-button'
import { PayrollShell } from '@/components/payroll/payroll-shell'
import { PayrollRosterDataTable } from '@/components/payroll/payroll-roster-data-table'

export default function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; view?: string }>
}) {
  return (
    <Suspense fallback={<PayrollListPageSkeleton />}>
      <PayrollPageContent searchParams={searchParams} />
    </Suspense>
  )
}

async function PayrollPageContent({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; view?: string }>
}) {
  let authUser
  try {
    authUser = await getAuthUser()
  } catch {
    redirect('/login')
  }

  const { month: monthParam, view: viewParam } = await searchParams
  const month = parseMonthFromQuery(monthParam)
  const viewType = viewParam === 'EXPECTED' ? 'EXPECTED' : 'LIVE'
  const monthStr = monthParam ?? ''

  return (
    <div className="flex h-0 min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <div className="flex shrink-0 items-center justify-between">
        <div className="space-y-0.5 flex w-full min-w-0 items-center gap-2">
          <h1 className="text-xl font-bold leading-tight tracking-tight sm:text-2xl">Payroll</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">Search, sort, and page the roster</p>
        </div>
        {can(authUser, 'payroll', 'export') && (
          <ExportPdfButton
            month={month}
            viewType={viewType}
            restaurantName={authUser.restaurant.name}
            restaurantPhone={authUser.restaurant.phone}
            restaurantAddress={authUser.restaurant.address}
            monthParam={monthStr}
          />
        )}
      </div>

      <PayrollShell
        month={month}
        monthParam={monthStr}
        viewType={viewType}
        tableContainerClassName="min-h-0 flex flex-1 flex-col overflow-hidden p-0"
        isTableEmpty={false}
        table={
          <PayrollRosterDataTable
            month={month}
            monthParam={monthStr}
            viewType={viewType}
          />
        }
      />
    </div>
  )
}
