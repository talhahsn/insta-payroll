import { Suspense } from 'react'
import { EmployeesListPageSkeleton } from '@/components/loading/table-page-skeletons'
import { EmployeesPageClient } from '@/components/employees/employees-page-client'

export default function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  return (
    <Suspense fallback={<EmployeesListPageSkeleton />}>
      <EmployeesPageLoader searchParams={searchParams} />
    </Suspense>
  )
}

async function EmployeesPageLoader({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  return <EmployeesPageClient initialStatus={status} />
}
