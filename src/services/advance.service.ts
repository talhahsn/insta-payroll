import { prisma } from '@/lib/prisma'
import { AppError } from '@/lib/errors'
import type { AuthUser } from '@/types/auth.types'
import type { AdvanceType } from '@prisma/client'
import * as repo from '@/repositories/advance.repository'
import { getOrCreateMonthlyPayroll } from '@/repositories/payroll.repository'

export async function getAdvances(user: AuthUser, monthDate?: Date) {
  return repo.findAdvances(user.restaurantId, monthDate)
}

export interface CreateAdvanceData {
  employeeId: string
  amount: number
  type: AdvanceType
  date: Date
  notes?: string
}

export async function createAdvance(data: CreateAdvanceData, user: AuthUser) {
  const employee = await prisma.employee.findFirst({
    where: { id: data.employeeId, restaurantId: user.restaurantId },
  })
  if (!employee) throw new AppError('NOT_FOUND', 'Employee not found')
  if (employee.status !== 'ACTIVE') throw new AppError('VALIDATION', 'Employee is not active')
  if (data.amount <= 0) throw new AppError('VALIDATION', 'Amount must be greater than zero')

  const payroll = await getOrCreateMonthlyPayroll(
    data.employeeId,
    data.date,
    user.restaurantId,
    employee.currentSalary
  )

  return repo.createAdvance({
    employeeId: data.employeeId,
    monthlyPayrollId: payroll.id,
    amount: data.amount,
    type: data.type,
    date: data.date,
    notes: data.notes,
    createdById: user.id,
    restaurantId: user.restaurantId,
  })
}

export async function deleteAdvance(id: string, user: AuthUser) {
  const advance = await repo.findAdvanceById(id)
  if (!advance) throw new AppError('NOT_FOUND', 'Advance not found')
  if (advance.employee.restaurantId !== user.restaurantId) {
    throw new AppError('FORBIDDEN', 'Access denied')
  }
  await repo.deleteAdvance(id)
}
