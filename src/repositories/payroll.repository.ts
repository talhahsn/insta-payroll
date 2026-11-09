import { prisma } from '@/lib/prisma'
import { toMonthKey } from '@/lib/month-key'

/**
 * Find or create a MonthlyPayroll record for an employee + month.
 * Used by leaves, advances, and coverage when recording entries.
 * Pass `baseSalary` when the caller already loaded the employee to skip an extra query.
 */
export async function getOrCreateMonthlyPayroll(
  employeeId: string,
  month: Date,
  restaurantId: string,
  baseSalary?: number
) {
  const monthStart = toMonthKey(month)

  let salary = baseSalary
  if (salary == null) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { currentSalary: true },
    })
    if (!employee) throw new Error('Employee not found')
    salary = employee.currentSalary
  }

  return prisma.monthlyPayroll.upsert({
    where: { employeeId_month: { employeeId, month: monthStart } },
    create: {
      employeeId,
      month: monthStart,
      baseSalary: salary,
      restaurantId,
    },
    update: {},
  })
}
