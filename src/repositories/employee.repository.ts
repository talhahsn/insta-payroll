import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { EmployeeStatus } from '@prisma/client'

export interface CreateEmployeeInput {
  name: string
  phone?: string
  employeeTypeId: string
  jobRoleIds?: string[]
  joinedAt: Date
  currentSalary: number
  depositDaysM1?: number
  depositDaysM2?: number
  billingCycleDay?: number
  notes?: string
  restaurantId: string
}

export interface UpdateEmployeeInput {
  name?: string
  employeeTypeId?: string
  jobRoleIds?: string[]
  currentSalary?: number
  status?: EmployeeStatus
  leftAt?: Date | null
  depositDaysM1?: number
  depositDaysM2?: number
  billingCycleDay?: number | null
  notes?: string
}

const jobRolesInclude = {
  jobRoles: { include: { jobRole: true } },
} as const

// statusFilter: true=active only, false=inactive only, undefined=all
export type EmployeeSortField = 'name' | 'salary' | 'joined'

function statusWhere(statusFilter: boolean | undefined) {
  if (statusFilter === true) return { status: 'ACTIVE' as const }
  if (statusFilter === false) return { status: 'INACTIVE' as const }
  return {}
}

function buildEmployeeListWhere(
  restaurantId: string,
  statusFilter: boolean | undefined,
  q: string | undefined,
  hideRestrictedTypes: boolean
) {
  const sw = statusWhere(statusFilter)
  const base: Prisma.EmployeeWhereInput = {
    restaurantId,
    ...sw,
  }
  if (hideRestrictedTypes) {
    base.employeeType = { isHiddenFromManager: false }
  }
  const trimmed = q?.trim()
  if (trimmed) {
    base.AND = [
      {
        OR: [
          { name: { contains: trimmed, mode: 'insensitive' } },
          { employeeType: { name: { contains: trimmed, mode: 'insensitive' } } },
          {
            jobRoles: {
              some: { jobRole: { name: { contains: trimmed, mode: 'insensitive' } } },
            },
          },
        ],
      },
    ]
  }
  return base
}

export async function findAllEmployees(restaurantId: string, statusFilter: boolean | undefined = true) {
  return prisma.employee.findMany({
    where: buildEmployeeListWhere(restaurantId, statusFilter, undefined, false),
    include: {
      employeeType: true,
      ...jobRolesInclude,
    },
    orderBy: { name: 'asc' },
  })
}

export async function countEmployeesForList(
  restaurantId: string,
  statusFilter: boolean | undefined,
  q: string | undefined,
  hideRestrictedTypes: boolean
) {
  return prisma.employee.count({
    where: buildEmployeeListWhere(restaurantId, statusFilter, q, hideRestrictedTypes),
  })
}

export async function findEmployeesPage(
  restaurantId: string,
  statusFilter: boolean | undefined,
  q: string | undefined,
  hideRestrictedTypes: boolean,
  sort: EmployeeSortField,
  order: 'asc' | 'desc',
  skip: number,
  take: number
) {
  const orderBy =
    sort === 'salary'
      ? { currentSalary: order }
      : sort === 'joined'
        ? { joinedAt: order }
        : { name: order }

  return prisma.employee.findMany({
    where: buildEmployeeListWhere(restaurantId, statusFilter, q, hideRestrictedTypes),
    include: {
      employeeType: true,
      ...jobRolesInclude,
    },
    orderBy,
    skip,
    take,
  })
}

export async function findEmployeeById(id: string, restaurantId: string) {
  return prisma.employee.findFirst({
    where: { id, restaurantId },
    include: {
      employeeType: true,
      ...jobRolesInclude,
      salaryHistory: { orderBy: { effectiveFrom: 'desc' } },
      securityDeposit: true,
      salaryHolds: { orderBy: { heldForMonth: 'desc' } },
    },
  })
}

export async function createEmployee(data: CreateEmployeeInput) {
  return prisma.$transaction(async (tx) => {
    const employee = await tx.employee.create({
      data: {
        name: data.name,
        phone: data.phone,
        employeeTypeId: data.employeeTypeId,
        joinedAt: data.joinedAt,
        currentSalary: data.currentSalary,
        depositDaysM1: data.depositDaysM1 ?? 7,
        depositDaysM2: data.depositDaysM2 ?? 7,
        billingCycleDay: data.billingCycleDay,
        notes: data.notes,
        restaurantId: data.restaurantId,
        jobRoles: {
          create: (data.jobRoleIds ?? []).map((jobRoleId) => ({ jobRoleId })),
        },
      },
      include: { employeeType: true, ...jobRolesInclude },
    })

    await tx.salaryHistory.create({
      data: {
        employeeId: employee.id,
        amount: data.currentSalary,
        effectiveFrom: data.joinedAt,
        restaurantId: data.restaurantId,
      },
    })

    return employee
  })
}

export async function updateEmployee(id: string, data: UpdateEmployeeInput) {
  const { jobRoleIds, currentSalary, ...rest } = data
  return prisma.employee.update({
    where: { id },
    data: {
      ...rest,
      ...(currentSalary !== undefined && { currentSalary }),
      ...(jobRoleIds !== undefined && {
        jobRoles: {
          deleteMany: {},
          create: jobRoleIds.map((jobRoleId) => ({ jobRoleId })),
        },
      }),
    },
    include: { employeeType: true, ...jobRolesInclude },
  })
}

export async function updateEmployeeSalary(
  employeeId: string,
  newSalary: number,
  effectiveFrom: Date,
  restaurantId: string
) {
  return prisma.$transaction(async (tx) => {
    const employee = await tx.employee.update({
      where: { id: employeeId },
      data: { currentSalary: newSalary },
    })
    await tx.salaryHistory.create({
      data: { employeeId, amount: newSalary, effectiveFrom, restaurantId },
    })
    // Sync baseSalary on open pay periods (pending / partial). Skip DONE months
    // (incl. settled ledger) so history stays correct; allow updates even if a
    // disbursement or $0 marker row already exists.
    const effectiveMonth = new Date(effectiveFrom.getFullYear(), effectiveFrom.getMonth(), 1)
    await tx.monthlyPayroll.updateMany({
      where: {
        employeeId,
        month: { gte: effectiveMonth },
        status: { in: ['PENDING', 'PARTIALLY_PAID'] },
      },
      data: { baseSalary: newSalary },
    })
    return employee
  })
}

export async function setEmployeeStatus(employeeId: string, status: 'ACTIVE' | 'INACTIVE') {
  return prisma.employee.update({
    where: { id: employeeId },
    data: { status, ...(status === 'ACTIVE' ? { leftAt: null } : {}) },
  })
}

export async function markEmployeeLeft(employeeId: string, leftAt: Date) {
  return prisma.employee.update({
    where: { id: employeeId },
    data: { status: 'INACTIVE', leftAt },
  })
}
