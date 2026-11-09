import { differenceInCalendarDays, isSameMonth } from 'date-fns'
import { prisma } from '@/lib/prisma'
import { AppError } from '@/lib/errors'
import type { AuthUser } from '@/types/auth.types'
import * as repo from '@/repositories/leave.repository'
import { getOrCreateMonthlyPayroll } from '@/repositories/payroll.repository'

function leaveDays(dateFrom: Date, dateTo: Date, isHalfDay: boolean): number {
  if (isHalfDay) return 0.5
  return differenceInCalendarDays(dateTo, dateFrom) + 1
}

export async function getLeaves(user: AuthUser, monthDate?: Date) {
  return repo.findLeaves(user.restaurantId, monthDate)
}

export interface CreateLeaveData {
  employeeId: string
  dateFrom: Date
  dateTo: Date
  isHalfDay: boolean
  notes?: string
}

export async function createLeave(data: CreateLeaveData, user: AuthUser) {
  const employee = await prisma.employee.findFirst({
    where: { id: data.employeeId, restaurantId: user.restaurantId },
    include: { employeeType: true },
  })
  if (!employee) throw new AppError('NOT_FOUND', 'Employee not found')
  if (employee.status !== 'ACTIVE') throw new AppError('VALIDATION', 'Employee is not active')
  if (!employee.employeeType.isLeaveEligible) {
    throw new AppError('VALIDATION', 'This employee type is not leave-eligible')
  }
  if (!isSameMonth(data.dateFrom, data.dateTo)) {
    throw new AppError('VALIDATION', 'Leave dates must be within the same month')
  }
  if (data.dateTo < data.dateFrom) {
    throw new AppError('VALIDATION', 'End date must be on or after start date')
  }

  const payroll = await getOrCreateMonthlyPayroll(
    data.employeeId,
    data.dateFrom,
    user.restaurantId,
    employee.currentSalary
  )

  const days = leaveDays(data.dateFrom, data.dateTo, data.isHalfDay)

  return prisma.$transaction(async (tx) => {
    const leave = await tx.leave.create({
      data: {
        employeeId: data.employeeId,
        monthlyPayrollId: payroll.id,
        dateFrom: data.dateFrom,
        dateTo: data.dateTo,
        isHalfDay: data.isHalfDay,
        notes: data.notes,
        createdById: user.id,
        restaurantId: user.restaurantId,
      },
    })
    await tx.employee.update({
      where: { id: data.employeeId },
      data: { leaveBalance: { decrement: days } },
    })
    return leave
  })
}

export async function deleteLeave(id: string, user: AuthUser) {
  const leave = await repo.findLeaveById(id)
  if (!leave) throw new AppError('NOT_FOUND', 'Leave not found')
  if (leave.employee.restaurantId !== user.restaurantId) {
    throw new AppError('FORBIDDEN', 'Access denied')
  }

  const days = leaveDays(leave.dateFrom, leave.dateTo, leave.isHalfDay)

  await prisma.$transaction(async (tx) => {
    await tx.leave.delete({ where: { id } })
    await tx.employee.update({
      where: { id: leave.employee.id },
      data: { leaveBalance: { increment: days } },
    })
  })
}
