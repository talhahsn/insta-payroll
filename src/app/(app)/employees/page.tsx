import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { EmployeesListPageSkeleton } from '@/components/loading/table-page-skeletons'
import { getAuthUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { Button } from '@/components/ui/button'
import { ListPageScrollRoot } from '@/components/layout/list-page-layout'
import { EmployeeStatusFilter } from '@/components/employees/employee-status-filter'
import { EmployeesDataTable } from '@/components/employees/employees-data-table'
import { Plus } from 'lucide-react'

export default function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  return (
    <Suspense fallback={<EmployeesListPageSkeleton />}>
      <EmployeesPageContent searchParams={searchParams} />
    </Suspense>
  )
}

async function EmployeesPageContent({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  let authUser
  try {
    authUser = await getAuthUser()
  } catch {
    redirect('/login')
  }

  const { status } = await searchParams
  const canManage = can(authUser, 'employees', 'manage')
  const statusFilter =
    status === 'inactive' ? 'inactive' : status === 'all' ? 'all' : 'active'

  return (
    <ListPageScrollRoot>
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-muted-foreground">Search, sort, and page the list below</p>
        </div>
        <div className="flex gap-2">
          <Suspense>
            <EmployeeStatusFilter />
          </Suspense>
          {canManage && (
            <Button render={<Link href="/employees/new" />}>
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          )}
        </div>
      </div>

      <EmployeesDataTable status={statusFilter} canManage={canManage} />
    </ListPageScrollRoot>
  )
}
