import { Suspense } from 'react'
import { AdvancesListPageSkeleton } from '@/components/loading/table-page-skeletons'
import { AdvancesPageClient } from '@/components/advances/advances-page-client'

export default function AdvancesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  return (
    <Suspense fallback={<AdvancesListPageSkeleton />}>
      <AdvancesPageLoader searchParams={searchParams} />
    </Suspense>
  )
}

async function AdvancesPageLoader({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month } = await searchParams
  return <AdvancesPageClient initialMonthParam={month} />
}
