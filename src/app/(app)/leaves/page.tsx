import { Suspense } from 'react'
import { LeavesListPageSkeleton } from '@/components/loading/table-page-skeletons'
import { LeavesPageClient } from '@/components/leaves/leaves-page-client'

export default function LeavesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  return (
    <Suspense fallback={<LeavesListPageSkeleton />}>
      <LeavesPageLoader searchParams={searchParams} />
    </Suspense>
  )
}

async function LeavesPageLoader({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month } = await searchParams
  return <LeavesPageClient initialMonthParam={month} />
}
