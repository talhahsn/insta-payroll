import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { AppContentScrollPage } from '@/components/layout/list-page-layout'
import { EmployeeForm } from '@/components/employees/employee-form'

export default async function NewEmployeePage() {
  let authUser
  try {
    authUser = await getAuthUser()
  } catch {
    redirect('/login')
  }

  if (!can(authUser, 'employees', 'manage')) redirect('/employees')

  const [employeeTypes, jobRoles] = await Promise.all([
    prisma.employeeType.findMany({ where: { restaurantId: authUser.restaurantId }, orderBy: { name: 'asc' } }),
    prisma.jobRole.findMany({ where: { restaurantId: authUser.restaurantId }, orderBy: { name: 'asc' } }),
  ])

  return (
    <AppContentScrollPage className="mx-auto w-full max-w-2xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Add Employee</h1>
          <p className="text-muted-foreground">Fill in the details to add a new employee</p>
        </div>
        <EmployeeForm employeeTypes={employeeTypes} jobRoles={jobRoles} />
      </div>
    </AppContentScrollPage>
  )
}
