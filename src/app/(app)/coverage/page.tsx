import { Suspense } from 'react'
import { CoverageListPageSkeleton } from '@/components/loading/table-page-skeletons'
import { CoveragePageClient } from '@/components/coverage/coverage-page-client'

export default function CoveragePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  return (
    <Suspense fallback={<CoverageListPageSkeleton />}>
      <CoveragePageLoader searchParams={searchParams} />
    </Suspense>
  )
}

async function CoveragePageLoader({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month } = await searchParams
  return <CoveragePageClient initialMonthParam={month} />
}
