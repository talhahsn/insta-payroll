import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { AppContentScrollPage } from '@/components/layout/list-page-layout'
import { CoverageForm } from '@/components/coverage/coverage-form'

export default async function NewCoveragePage() {
  let authUser
  try {
    authUser = await getAuthUser()
  } catch {
    redirect('/login')
  }

  const canViewRestrictedTypes = can(authUser, 'employees', 'view_all')

  const [absentEmployees, allActiveEmployees, counters] = await Promise.all([
    prisma.employee.findMany({
      where: {
        restaurantId: authUser.restaurantId,
        status: 'ACTIVE',
        ...(canViewRestrictedTypes
          ? {}
          : { employeeType: { isHiddenFromManager: false } }),
      },
      select: { id: true, name: true, currentSalary: true },
      orderBy: { name: 'asc' },
    }),
    prisma.employee.findMany({
      where: {
        restaurantId: authUser.restaurantId,
        status: 'ACTIVE',
      },
      select: { id: true, name: true, currentSalary: true },
      orderBy: { name: 'asc' },
    }),
    prisma.counter.findMany({
      where: { restaurantId: authUser.restaurantId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <AppContentScrollPage className="mx-auto w-full max-w-2xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Record Coverage</h1>
          <p className="text-muted-foreground">Record a shift substitution between employees</p>
        </div>
        <CoverageForm
          absentEmployees={absentEmployees}
          coveringEmployees={allActiveEmployees}
          counters={counters}
        />
      </div>
    </AppContentScrollPage>
  )
}
