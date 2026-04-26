import { redirect, notFound } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { AppContentScrollPage } from '@/components/layout/list-page-layout'
import { EmployeeForm } from '@/components/employees/employee-form'
import { getEmployee } from '@/services/employee.service'

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  let authUser
  try {
    authUser = await getAuthUser()
  } catch {
    redirect('/login')
  }

  if (!can(authUser, 'employees', 'manage')) redirect('/employees')

  const { id } = await params
  let employee
  try {
    employee = await getEmployee(id, authUser)
  } catch {
    notFound()
  }

  const [employeeTypes, jobRoles] = await Promise.all([
    prisma.employeeType.findMany({ where: { restaurantId: authUser.restaurantId }, orderBy: { name: 'asc' } }),
    prisma.jobRole.findMany({ where: { restaurantId: authUser.restaurantId }, orderBy: { name: 'asc' } }),
  ])

  return (
    <AppContentScrollPage className="mx-auto w-full max-w-2xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Edit Employee</h1>
          <p className="text-muted-foreground">Update {employee.name}&apos;s details</p>
        </div>
        <EmployeeForm
          employee={employee}
          employeeTypes={employeeTypes}
          jobRoles={jobRoles}
          canUpdateSalary={authUser.isProtectedRole}
        />
      </div>
    </AppContentScrollPage>
  )
}
