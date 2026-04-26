import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth } from 'date-fns'

export interface CreateCoverageInput {
  absentEmployeeId: string
  coveringEmployeeId: string
  counterId: string
  dateFrom: Date
  dateTo: Date
  ratePerDay: number
  payrollIdAbsent: string
  payrollIdCovering: string
  createdById: string
  restaurantId: string
}

export async function findCoverages(restaurantId: string, monthDate?: Date) {
  const monthFilter = monthDate
    ? {
        dateFrom: { gte: startOfMonth(monthDate) },
        dateTo: { lte: endOfMonth(monthDate) },
      }
    : {}

  return prisma.shiftCoverage.findMany({
    where: { restaurantId, ...monthFilter },
    include: {
      absentEmployee: { select: { id: true, name: true } },
      coveringEmployee: { select: { id: true, name: true } },
      counter: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { dateFrom: 'desc' },
  })
}

export async function findCoverageById(id: string) {
  return prisma.shiftCoverage.findUnique({
    where: { id },
    include: {
      absentEmployee: { select: { id: true, name: true, restaurantId: true } },
      coveringEmployee: { select: { id: true, name: true } },
    },
  })
}

export async function createCoverage(data: CreateCoverageInput) {
  return prisma.shiftCoverage.create({ data })
}

export async function deleteCoverage(id: string) {
  return prisma.shiftCoverage.delete({ where: { id } })
}
