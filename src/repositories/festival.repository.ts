import { prisma } from '@/lib/prisma'
import type { BonusType } from '@prisma/client'

export interface CreateFestivalEventInput {
  name: string
  eventDate: Date
  bonusType: BonusType
  bonusValue: number
  appliesToMonth: Date
  restaurantId: string
}

export async function findFestivalEvents(restaurantId: string) {
  return prisma.festivalEvent.findMany({
    where: { restaurantId },
    include: {
      _count: { select: { bonuses: true } },
    },
    orderBy: { eventDate: 'desc' },
  })
}

export async function findFestivalEventById(id: string) {
  return prisma.festivalEvent.findUnique({
    where: { id },
    include: {
      bonuses: {
        include: {
          monthlyPayroll: {
            include: { employee: { select: { name: true } } },
          },
        },
        orderBy: { monthlyPayroll: { employee: { name: 'asc' } } },
      },
    },
  })
}

export async function createFestivalEvent(data: CreateFestivalEventInput) {
  return prisma.festivalEvent.create({ data })
}

export async function deleteFestivalEvent(id: string) {
  return prisma.$transaction([
    prisma.festivalBonus.deleteMany({ where: { festivalEventId: id } }),
    prisma.festivalEvent.delete({ where: { id } }),
  ])
}
