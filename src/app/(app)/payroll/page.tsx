import { Suspense } from 'react'
import { PayrollListPageSkeleton } from '@/components/loading/table-page-skeletons'
import { PayrollPageClient } from '@/components/payroll/payroll-page-client'

export default function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; view?: string }>
}) {
  return (
    <Suspense fallback={<PayrollListPageSkeleton />}>
      <PayrollPageLoader searchParams={searchParams} />
    </Suspense>
  )
}

async function PayrollPageLoader({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; view?: string }>
}) {
  // Auth is enforced in (app)/layout (React.cache-deduped).
  const { month: monthParam, view: viewParam } = await searchParams
  return (
    <PayrollPageClient
      initialMonthParam={monthParam}
      initialView={viewParam}
    />
  )
}
