import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { SettingsEmployeeTypesPageSkeleton } from '@/components/loading/table-page-skeletons'
import { getAuthUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { ListPageScrollRoot } from '@/components/layout/list-page-layout'
import { EmployeeTypeTable } from '@/components/settings/employee-type-table'

export default function EmployeeTypesSettingsPage() {
  return (
    <Suspense fallback={<SettingsEmployeeTypesPageSkeleton />}>
      <EmployeeTypesSettingsContent />
    </Suspense>
  )
}

async function EmployeeTypesSettingsContent() {
  let authUser
  try {
    authUser = await getAuthUser()
  } catch {
    redirect('/login')
  }

  if (!can(authUser, 'settings', 'manage')) redirect('/dashboard')

  const types = await prisma.employeeType.findMany({
    where: { restaurantId: authUser.restaurantId },
    orderBy: { name: 'asc' },
  })

  return (
    <ListPageScrollRoot className="mx-auto w-full max-w-2xl gap-6">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold">Employee Types</h1>
        <p className="text-muted-foreground">Configure employee categories and their payroll behaviour</p>
      </div>
      <EmployeeTypeTable types={types} />
    </ListPageScrollRoot>
  )
}
