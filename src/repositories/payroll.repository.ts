import { prisma } from '@/lib/prisma'
import { toMonthKey } from '@/lib/month-key'

/**
 * Find or create a MonthlyPayroll record for an employee + month.
 * Used by leaves, advances, and coverage when recording entries.
 */
export async function getOrCreateMonthlyPayroll(
  employeeId: string,
  month: Date,
  restaurantId: string
) {
  const monthStart = toMonthKey(month)

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { currentSalary: true },
  })
  if (!employee) throw new Error('Employee not found')

  return prisma.monthlyPayroll.upsert({
    where: { employeeId_month: { employeeId, month: monthStart } },
    create: {
      employeeId,
      month: monthStart,
      baseSalary: employee.currentSalary,
      restaurantId,
    },
    update: {},
  })
}
