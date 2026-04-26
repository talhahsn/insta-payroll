import { startOfMonth } from 'date-fns'
import { prisma } from '@/lib/prisma'
import { AppError } from '@/lib/errors'
import { can } from '@/lib/permissions'
import { getDailyRate } from '@/services/payroll.service'
import type { AuthUser } from '@/types/auth.types'
import type { BonusType } from '@prisma/client'
import * as repo from '@/repositories/festival.repository'
import { getOrCreateMonthlyPayroll } from '@/repositories/payroll.repository'

export async function getFestivalEvents(user: AuthUser) {
  return repo.findFestivalEvents(user.restaurantId)
}

export async function getFestivalEvent(id: string, user: AuthUser) {
  const event = await repo.findFestivalEventById(id)
  if (!event) throw new AppError('NOT_FOUND', 'Festival event not found')
  if (event.restaurantId !== user.restaurantId) throw new AppError('FORBIDDEN', 'Access denied')
  return event
}

export interface CreateFestivalEventData {
  name: string
  eventDate: Date
  bonusType: BonusType
  bonusValue: number
  appliesToMonth: Date
}

export async function createFestivalEvent(data: CreateFestivalEventData, user: AuthUser) {
  if (!can(user, 'festivals', 'manage')) throw new AppError('FORBIDDEN', 'Permission denied')
  if (data.bonusValue <= 0) throw new AppError('VALIDATION', 'Bonus value must be greater than zero')

  const appliesToMonth = startOfMonth(data.appliesToMonth)

  const event = await repo.createFestivalEvent({
    ...data,
    appliesToMonth,
    restaurantId: user.restaurantId,
  })

  const employees = await prisma.employee.findMany({
    where: {
      restaurantId: user.restaurantId,
      status: 'ACTIVE',
      ...(data.bonusType === 'DAYS_SALARY' && {
        employeeType: { isDailyRate: true },
      }),
    },
    select: { id: true, currentSalary: true },
  })

  await Promise.all(
    employees.map(async (emp) => {
      const amount =
        data.bonusType === 'FIXED'
          ? data.bonusValue
          : data.bonusValue * getDailyRate(emp.currentSalary)

      const payroll = await getOrCreateMonthlyPayroll(emp.id, appliesToMonth, user.restaurantId)

      await prisma.festivalBonus.create({
        data: {
          festivalEventId: event.id,
          monthlyPayrollId: payroll.id,
          amount,
          restaurantId: user.restaurantId,
        },
      })
    })
  )

  return event
}

export async function deleteFestivalEvent(id: string, user: AuthUser) {
  if (!can(user, 'festivals', 'manage')) throw new AppError('FORBIDDEN', 'Permission denied')
  const event = await prisma.festivalEvent.findUnique({ where: { id } })
  if (!event) throw new AppError('NOT_FOUND', 'Festival event not found')
  if (event.restaurantId !== user.restaurantId) throw new AppError('FORBIDDEN', 'Access denied')
  await repo.deleteFestivalEvent(id)
}
