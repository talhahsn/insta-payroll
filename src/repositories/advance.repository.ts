import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth } from 'date-fns'
import type { AdvanceType } from '@prisma/client'

export interface CreateAdvanceInput {
  employeeId: string
  monthlyPayrollId: string
  amount: number
  type: AdvanceType
  date: Date
  notes?: string
  createdById: string
  restaurantId: string
}

export async function findAdvances(restaurantId: string, monthDate?: Date) {
  const monthFilter = monthDate
    ? {
        date: {
          gte: startOfMonth(monthDate),
          lte: endOfMonth(monthDate),
        },
      }
    : {}

  return prisma.advance.findMany({
    where: { restaurantId, ...monthFilter },
    include: {
      employee: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { date: 'desc' },
  })
}

export async function findAdvanceById(id: string) {
  return prisma.advance.findUnique({
    where: { id },
    include: {
      employee: { select: { id: true, name: true, restaurantId: true } },
    },
  })
}

export async function createAdvance(data: CreateAdvanceInput) {
  return prisma.advance.create({ data })
}

export async function deleteAdvance(id: string) {
  return prisma.advance.delete({ where: { id } })
}
