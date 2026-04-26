import { isSameMonth } from 'date-fns'
import { prisma } from '@/lib/prisma'
import { AppError } from '@/lib/errors'
import { can } from '@/lib/permissions'
import { getDailyRate } from '@/services/payroll.service'
import type { AuthUser } from '@/types/auth.types'
import * as repo from '@/repositories/coverage.repository'
import { getOrCreateMonthlyPayroll } from '@/repositories/payroll.repository'

export async function getCoverages(user: AuthUser, monthDate?: Date) {
  return repo.findCoverages(user.restaurantId, monthDate)
}

export interface CreateCoverageData {
  absentEmployeeId: string
  coveringEmployeeId: string
  counterId: string
  dateFrom: Date
  dateTo: Date
  ratePerDay: number
}

export async function getDefaultRate(employeeId: string, restaurantId: string): Promise<number> {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, restaurantId },
    select: { currentSalary: true },
  })
  if (!employee) throw new AppError('NOT_FOUND', 'Employee not found')
  return getDailyRate(employee.currentSalary)
}

export async function createCoverage(data: CreateCoverageData, user: AuthUser) {
  if (data.absentEmployeeId === data.coveringEmployeeId) {
    throw new AppError('VALIDATION', 'Absent and covering employee must be different')
  }
  if (!isSameMonth(data.dateFrom, data.dateTo)) {
    throw new AppError('VALIDATION', 'Coverage dates must be within the same month')
  }
  if (data.dateTo < data.dateFrom) {
    throw new AppError('VALIDATION', 'End date must be on or after start date')
  }
  if (data.ratePerDay <= 0) {
    throw new AppError('VALIDATION', 'Rate must be greater than zero')
  }

  // Validate both employees belong to this restaurant and are active
  const [absent, covering, counter] = await Promise.all([
    prisma.employee.findFirst({
      where: { id: data.absentEmployeeId, restaurantId: user.restaurantId, status: 'ACTIVE' },
    }),
    prisma.employee.findFirst({
      where: { id: data.coveringEmployeeId, restaurantId: user.restaurantId, status: 'ACTIVE' },
    }),
    prisma.counter.findFirst({
      where: { id: data.counterId, restaurantId: user.restaurantId },
    }),
  ])

  if (!absent) throw new AppError('NOT_FOUND', 'Absent employee not found or inactive')
  if (!covering) throw new AppError('NOT_FOUND', 'Covering employee not found or inactive')
  if (!counter) throw new AppError('NOT_FOUND', 'Counter not found')

  // Users without employees.view_all must not access restricted employee types
  if (!can(user, 'employees', 'view_all')) {
    const absentType = await prisma.employeeType.findFirst({
      where: { id: absent.employeeTypeId, restaurantId: user.restaurantId },
      select: { isHiddenFromManager: true },
    })
    if (absentType?.isHiddenFromManager) {
      throw new AppError('FORBIDDEN', 'Access denied')
    }
  }

  // Create/get payroll records for both employees
  const [payrollAbsent, payrollCovering] = await Promise.all([
    getOrCreateMonthlyPayroll(data.absentEmployeeId, data.dateFrom, user.restaurantId),
    getOrCreateMonthlyPayroll(data.coveringEmployeeId, data.dateFrom, user.restaurantId),
  ])

  return repo.createCoverage({
    absentEmployeeId: data.absentEmployeeId,
    coveringEmployeeId: data.coveringEmployeeId,
    counterId: data.counterId,
    dateFrom: data.dateFrom,
    dateTo: data.dateTo,
    ratePerDay: data.ratePerDay,
    payrollIdAbsent: payrollAbsent.id,
    payrollIdCovering: payrollCovering.id,
    createdById: user.id,
    restaurantId: user.restaurantId,
  })
}

export async function deleteCoverage(id: string, user: AuthUser) {
  const coverage = await repo.findCoverageById(id)
  if (!coverage) throw new AppError('NOT_FOUND', 'Coverage not found')
  if (coverage.absentEmployee.restaurantId !== user.restaurantId) {
    throw new AppError('FORBIDDEN', 'Access denied')
  }
  await repo.deleteCoverage(id)
}
