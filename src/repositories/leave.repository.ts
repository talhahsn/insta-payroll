import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth } from 'date-fns'

export interface CreateLeaveInput {
  employeeId: string
  monthlyPayrollId: string
  dateFrom: Date
  dateTo: Date
  isHalfDay: boolean
  notes?: string
  createdById: string
  restaurantId: string
}

export async function findLeaves(restaurantId: string, monthDate?: Date) {
  const monthFilter = monthDate
    ? {
        dateFrom: { gte: startOfMonth(monthDate) },
        dateTo: { lte: endOfMonth(monthDate) },
      }
    : {}

  return prisma.leave.findMany({
    where: { restaurantId, ...monthFilter },
    include: {
      employee: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { dateFrom: 'desc' },
  })
}

export async function findLeaveById(id: string) {
  return prisma.leave.findUnique({
    where: { id },
    include: {
      employee: { select: { id: true, name: true, restaurantId: true } },
    },
  })
}

export async function createLeave(data: CreateLeaveInput) {
  return prisma.leave.create({ data })
}

export async function deleteLeave(id: string) {
  return prisma.leave.delete({ where: { id } })
}
