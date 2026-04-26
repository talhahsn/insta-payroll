import { AppError } from '@/lib/errors'
import { can } from '@/lib/permissions'
import * as repo from '@/repositories/employee.repository'
import type { EmployeeSortField } from '@/repositories/employee.repository'
import type { AuthUser } from '@/types/auth.types'
import { prisma } from '@/lib/prisma'
import { toMonthKey } from '@/lib/month-key'

// statusFilter: true=active only, false=inactive only, undefined=all
export async function getEmployees(user: AuthUser, statusFilter: boolean | undefined = true) {
  const employees = await repo.findAllEmployees(user.restaurantId, statusFilter)

  // Filter restricted employee types for users without view_all
  if (!can(user, 'employees', 'view_all')) {
    return employees.filter((e) => !e.employeeType.isHiddenFromManager)
  }
  return employees
}

export type EmployeesPageParams = {
  q?: string
  sort: EmployeeSortField
  order: 'asc' | 'desc'
  page: number
  pageSize: number
}

/** Paged + searchable list (server). Respects view_all for hidden types. */
export async function getEmployeesPage(
  user: AuthUser,
  statusFilter: boolean | undefined,
  opts: EmployeesPageParams
) {
  const hideRestricted = !can(user, 'employees', 'view_all')
  const skip = (opts.page - 1) * opts.pageSize
  const [rows, total] = await Promise.all([
    repo.findEmployeesPage(
      user.restaurantId,
      statusFilter,
      opts.q,
      hideRestricted,
      opts.sort,
      opts.order,
      skip,
      opts.pageSize
    ),
    repo.countEmployeesForList(user.restaurantId, statusFilter, opts.q, hideRestricted),
  ])
  return { rows, total }
}

export async function getEmployee(id: string, user: AuthUser) {
  const employee = await repo.findEmployeeById(id, user.restaurantId)
  if (!employee) throw new AppError('NOT_FOUND', 'Employee not found')

  if (!can(user, 'employees', 'view_all') && employee.employeeType.isHiddenFromManager) {
    throw new AppError('FORBIDDEN', 'Access denied')
  }
  return employee
}

export async function createEmployee(
  data: repo.CreateEmployeeInput,
  user: AuthUser
) {
  if (!can(user, 'employees', 'manage')) {
    throw new AppError('FORBIDDEN', 'Permission denied')
  }

  const empType = await prisma.employeeType.findFirst({
    where: { id: data.employeeTypeId, restaurantId: user.restaurantId },
  })
  if (!empType) throw new AppError('NOT_FOUND', 'Employee type not found')

  return repo.createEmployee({ ...data, restaurantId: user.restaurantId })
}

export async function updateEmployee(
  id: string,
  data: repo.UpdateEmployeeInput,
  user: AuthUser
) {
  if (!can(user, 'employees', 'manage')) {
    throw new AppError('FORBIDDEN', 'Permission denied')
  }
  const employee = await repo.findEmployeeById(id, user.restaurantId)
  if (!employee) throw new AppError('NOT_FOUND', 'Employee not found')

  // Salary change: Super Admin only, creates history record
  if (data.currentSalary !== undefined && data.currentSalary !== employee.currentSalary) {
    if (!user.isProtectedRole) throw new AppError('FORBIDDEN', 'Only Super Admin can update salary')
    await repo.updateEmployeeSalary(id, data.currentSalary, new Date(), user.restaurantId)
  }

  return repo.updateEmployee(id, data)
}

export async function updateSalary(
  employeeId: string,
  newSalary: number,
  effectiveFrom: Date,
  user: AuthUser
) {
  if (!can(user, 'employees', 'manage')) {
    throw new AppError('FORBIDDEN', 'Permission denied')
  }
  const employee = await repo.findEmployeeById(employeeId, user.restaurantId)
  if (!employee) throw new AppError('NOT_FOUND', 'Employee not found')
  if (newSalary <= 0) throw new AppError('VALIDATION', 'Salary must be greater than 0')

  return repo.updateEmployeeSalary(employeeId, newSalary, effectiveFrom, user.restaurantId)
}

export async function toggleEmployeeStatus(employeeId: string, user: AuthUser) {
  if (!can(user, 'employees', 'manage')) {
    throw new AppError('FORBIDDEN', 'Permission denied')
  }
  const employee = await repo.findEmployeeById(employeeId, user.restaurantId)
  if (!employee) throw new AppError('NOT_FOUND', 'Employee not found')

  const newStatus = employee.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
  return repo.setEmployeeStatus(employeeId, newStatus)
}

export async function markEmployeeLeft(
  employeeId: string,
  leftAt: Date,
  user: AuthUser
) {
  if (!can(user, 'employees', 'manage')) {
    throw new AppError('FORBIDDEN', 'Permission denied')
  }
  const employee = await repo.findEmployeeById(employeeId, user.restaurantId)
  if (!employee) throw new AppError('NOT_FOUND', 'Employee not found')

  const releaseMonth = toMonthKey(leftAt)

  const releasePayroll = await prisma.monthlyPayroll.upsert({
    where: { employeeId_month: { employeeId, month: releaseMonth } },
    create: {
      employeeId,
      month: releaseMonth,
      baseSalary: employee.currentSalary,
      restaurantId: user.restaurantId,
    },
    update: {},
  })

  // Auto-release security deposit
  if (employee.securityDeposit && !employee.securityDeposit.releasedAt) {
    await prisma.securityDeposit.update({
      where: { employeeId },
      data: {
        releasedAt: leftAt,
        releasedInPayrollId: releasePayroll.id,
      },
    })
  }

  // Auto-release all unreleased salary holds
  await prisma.salaryHold.updateMany({
    where: { employeeId, releasedInPayrollId: null },
    data: {
      releasedInPayrollId: releasePayroll.id,
      releasedAt: leftAt,
    },
  })

  return repo.markEmployeeLeft(employeeId, leftAt)
}
