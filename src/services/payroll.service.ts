import {
  differenceInCalendarDays,
  startOfMonth,
  endOfMonth,
  min,
  max,
} from 'date-fns'
import { prisma } from '@/lib/prisma'
import { AppError } from '@/lib/errors'
import type { PayrollCalculation } from '@/types/payroll.types'
import { toMonthKey } from '@/lib/month-key'

const DAILY_RATE_DIVISOR = 30

export function getDailyRate(monthlySalary: number): number {
  return monthlySalary / DAILY_RATE_DIVISOR
}

/**
 * Calculate working days for a given employee in a month.
 * Handles mid-month joiners, leavers, and full-month employees.
 * For LIVE view, caps at today.
 */
export function calculateWorkingDays(
  monthStart: Date,
  monthEnd: Date,
  joinedAt: Date,
  leftAt: Date | null,
  viewType: 'LIVE' | 'EXPECTED'
): number {
  const today = new Date()
  const effectiveEnd = viewType === 'LIVE' ? min([monthEnd, today]) : monthEnd
  const effectiveStart = max([monthStart, joinedAt])
  const effectiveLeft = leftAt ? min([leftAt, effectiveEnd]) : effectiveEnd

  const days = differenceInCalendarDays(effectiveLeft, effectiveStart) + 1
  return Math.max(0, Math.min(days, DAILY_RATE_DIVISOR))
}

/**
 * Count total leave days for an employee in a given payroll.
 * Half-days count as 0.5.
 * Returns total days consumed from leave balance.
 */
export function countLeaveDays(
  leaves: Array<{ dateFrom: Date; dateTo: Date; isHalfDay: boolean }>,
  monthStart: Date,
  monthEnd: Date
): number {
  let total = 0
  for (const leave of leaves) {
    if (leave.isHalfDay) {
      total += 0.5
      continue
    }
    // Clip leave range to the current month
    const from = max([leave.dateFrom, monthStart])
    const to = min([leave.dateTo, monthEnd])
    if (from <= to) {
      total += differenceInCalendarDays(to, from) + 1
    }
  }
  return total
}

/**
 * DONE months use the frozen `MonthlyPayroll.baseSalary` (ledger / closed period).
 * Open periods use the latest salary history row effective on or before month end
 * (so mid-month raises apply) or `currentSalary`.
 */
function resolveBaseSalaryForPeriod(
  currentSalary: number,
  latestSalaryHistoryAmount: number | null | undefined,
  payroll: {
    status: 'PENDING' | 'PARTIALLY_PAID' | 'DONE'
    baseSalary: number
  } | null
): number {
  if (payroll?.status === 'DONE') {
    return payroll.baseSalary
  }
  return latestSalaryHistoryAmount ?? currentSalary
}

/**
 * Main payroll calculation function.
 * Can be called for any employee + month combination.
 */
export async function calculatePayroll(
  employeeId: string,
  month: Date,
  viewType: 'LIVE' | 'EXPECTED',
  restaurantId: string
): Promise<PayrollCalculation> {
  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const monthKey = toMonthKey(month)

  // Fetch employee with all month data in parallel
  const [employee, payroll, monthlyHolds] = await Promise.all([
    prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        employeeType: true,
        securityDeposit: true,
        salaryHistory: {
          where: { effectiveFrom: { lte: monthEnd } },
          orderBy: { effectiveFrom: 'desc' },
          take: 1,
          select: { amount: true },
        },
      },
    }),
    prisma.monthlyPayroll.findUnique({
      where: { employeeId_month: { employeeId, month: monthKey } },
      include: {
        leaves: true,
        advances: true,
        coveragesAsCovering: true,
        festivalBonuses: true,
        salaryHoldReleases: true,
      },
    }),
    prisma.salaryHold.findMany({
      where: { employeeId, heldForMonth: monthKey },
    }),
  ])

  if (!employee) throw new AppError('NOT_FOUND', 'Employee not found')
  if (employee.restaurantId !== restaurantId) throw new AppError('FORBIDDEN', 'Access denied')

  const baseSalary = resolveBaseSalaryForPeriod(
    employee.currentSalary,
    employee.salaryHistory[0]?.amount,
    payroll
  )
  const dailyRate = getDailyRate(baseSalary)

  // ── Working days ──────────────────────────────────────────────────────────
  const workingDays = calculateWorkingDays(
    monthStart,
    monthEnd,
    employee.joinedAt,
    employee.leftAt,
    viewType
  )
  const baseEarned = dailyRate * workingDays

  // ── Leaves ────────────────────────────────────────────────────────────────
  const leaves = payroll?.leaves ?? []
  const leaveDays = countLeaveDays(leaves, monthStart, monthEnd)

  // Leave balance: how many free days the employee has going into this month
  // Clamp to 0 — negative balance means no free days, not extra chargeable days
  const freeLeaves = Math.min(leaveDays, Math.max(0, employee.leaveBalance))
  const chargeableLeaves = Math.max(0, leaveDays - freeLeaves)
  const leaveDeduction = chargeableLeaves * dailyRate

  // ── Shift coverage bonus ──────────────────────────────────────────────────
  const coverages = payroll?.coveragesAsCovering ?? []
  const coverageBonus = coverages.reduce((sum, c) => {
    const days = differenceInCalendarDays(c.dateTo, c.dateFrom) + 1
    return sum + c.ratePerDay * days
  }, 0)

  // ── Advances & food expenses ──────────────────────────────────────────────
  const advances = payroll?.advances ?? []
  const advancesTotal = advances
    .filter((a) => a.type === 'CASH')
    .reduce((sum, a) => sum + a.amount, 0)
  const foodExpensesTotal = advances
    .filter((a) => a.type === 'FOOD')
    .reduce((sum, a) => sum + a.amount, 0)

  // ── Security deposit ──────────────────────────────────────────────────────
  let securityDepositDeduction = 0
  let securityDepositRelease = 0

  if (employee.employeeType.isDepositEligible && employee.securityDeposit) {
    const deposit = employee.securityDeposit
    if (deposit.month1PayrollId === payroll?.id) {
      securityDepositDeduction = deposit.month1Withheld
    } else if (deposit.month2PayrollId === payroll?.id) {
      securityDepositDeduction = deposit.month2Withheld
    }
    if (deposit.releasedInPayrollId === payroll?.id) {
      securityDepositRelease = deposit.totalWithheld
    }
  }

  // ── Festival bonuses ──────────────────────────────────────────────────────
  const festivalBonus = (payroll?.festivalBonuses ?? []).reduce(
    (sum, b) => sum + b.amount,
    0
  )

  // ── Salary hold deductions (withheld from this month's payroll) ──────────
  const salaryHoldDeduction = monthlyHolds.reduce((sum, h) => sum + h.amount, 0)

  // ── Salary hold releases (withheld salary paid out this month) ───────────
  const salaryHoldRelease = (payroll?.salaryHoldReleases ?? []).reduce(
    (sum, h) => sum + h.amount,
    0
  )

  // ── Disbursements ─────────────────────────────────────────────────────────
  const amountPaid = payroll?.amountPaid ?? 0

  // ── Totals ────────────────────────────────────────────────────────────────
  const grossEarned = baseEarned + coverageBonus + securityDepositRelease + festivalBonus + salaryHoldRelease
  const totalDeductions = leaveDeduction + advancesTotal + foodExpensesTotal + securityDepositDeduction + salaryHoldDeduction
  const netPayable = grossEarned - totalDeductions
  const remainingToPay = netPayable - amountPaid

  return {
    employeeId,
    employeeName: employee.name,
    month: monthStart,
    viewType,
    baseSalary,
    dailyRate,
    workingDays,
    baseEarned,
    leaveDays,
    freeLeaves,
    leaveDeduction,
    coverageBonus,
    advancesTotal,
    foodExpensesTotal,
    securityDepositDeduction,
    securityDepositRelease,
    festivalBonus,
    salaryHoldDeduction,
    salaryHoldRelease,
    grossEarned,
    totalDeductions,
    netPayable,
    amountPaid,
    remainingToPay,
  }
}

/**
 * Calculate payroll for all active employees in a restaurant for a given month.
 * If this month was filled from a Cafe ledger migration (`isLedgerBackfill`),
 * the roster is only employees who have a `MonthlyPayroll` for that month,
 * so list totals match the JSON.
 */
export async function calculateMonthlyRoster(
  month: Date,
  viewType: 'LIVE' | 'EXPECTED',
  restaurantId: string,
  canViewAll: boolean
): Promise<PayrollCalculation[]> {
  const monthStart = startOfMonth(month)
  const monthKey = toMonthKey(month)
  const monthEnd = endOfMonth(month)

  const employeeVisFilter = !canViewAll
    ? { employeeType: { isHiddenFromManager: false } }
    : {}

  const baseWhere = { restaurantId, ...employeeVisFilter }

  const salaryHistoryInclude = {
    employeeType: {
      select: { isDepositEligible: true },
    },
    securityDeposit: {
      select: {
        month1PayrollId: true,
        month2PayrollId: true,
        month1Withheld: true,
        month2Withheld: true,
        releasedInPayrollId: true,
        totalWithheld: true,
      },
    },
    salaryHistory: {
      where: { effectiveFrom: { lte: monthEnd } },
      orderBy: { effectiveFrom: 'desc' as const },
      take: 1,
      select: { amount: true },
    },
  }

  // One round-trip: if any ledger-backfill payrolls exist for the month, scope to those
  // employees; otherwise load the normal active/left-in-month set.
  const ledgerRows = await prisma.monthlyPayroll.findMany({
    where: {
      restaurantId,
      month: monthKey,
      isLedgerBackfill: true,
      ...(!canViewAll && {
        employee: { employeeType: { isHiddenFromManager: false } },
      }),
    },
    select: { employeeId: true },
  })
  const ledgerIds = [...new Set(ledgerRows.map((r) => r.employeeId))]

  const employees =
    ledgerIds.length > 0
      ? await prisma.employee.findMany({
          where: {
            ...baseWhere,
            id: { in: ledgerIds },
          },
          include: salaryHistoryInclude,
          orderBy: { name: 'asc' },
        })
      : await prisma.employee.findMany({
          where: {
            ...baseWhere,
            OR: [
              { status: 'ACTIVE', joinedAt: { lte: monthEnd } },
              { status: 'INACTIVE', leftAt: { gte: monthStart, lte: monthEnd } },
            ],
          },
          include: salaryHistoryInclude,
          orderBy: { name: 'asc' },
        })

  const employeeIds = employees.map((e) => e.id)
  if (employeeIds.length === 0) return []

  const [payrolls, holds] = await Promise.all([
    prisma.monthlyPayroll.findMany({
      where: {
        restaurantId,
        month: monthKey,
        employeeId: { in: employeeIds },
      },
      select: {
        id: true,
        employeeId: true,
        status: true,
        baseSalary: true,
        amountPaid: true,
        leaves: {
          select: { dateFrom: true, dateTo: true, isHalfDay: true },
        },
        advances: {
          select: { type: true, amount: true },
        },
        coveragesAsCovering: {
          select: { dateFrom: true, dateTo: true, ratePerDay: true },
        },
        festivalBonuses: {
          select: { amount: true },
        },
        salaryHoldReleases: {
          select: { amount: true },
        },
      },
    }),
    prisma.salaryHold.findMany({
      where: {
        employeeId: { in: employeeIds },
        heldForMonth: monthKey,
      },
      select: { employeeId: true, amount: true },
    }),
  ])

  const payrollByEmployee = new Map(payrolls.map((p) => [p.employeeId, p]))
  const holdsByEmployee = new Map<string, number>()
  for (const h of holds) {
    holdsByEmployee.set(h.employeeId, (holdsByEmployee.get(h.employeeId) ?? 0) + h.amount)
  }

  const results: PayrollCalculation[] = employees.map((employee) => {
    const payroll = payrollByEmployee.get(employee.id) ?? null
    const baseSalary = resolveBaseSalaryForPeriod(
      employee.currentSalary,
      employee.salaryHistory[0]?.amount,
      payroll
    )
    const dailyRate = getDailyRate(baseSalary)

    const workingDays = calculateWorkingDays(
      monthStart,
      monthEnd,
      employee.joinedAt,
      employee.leftAt,
      viewType
    )
    const baseEarned = dailyRate * workingDays

    const leaves = payroll?.leaves ?? []
    const leaveDays = countLeaveDays(leaves, monthStart, monthEnd)
    const freeLeaves = Math.min(leaveDays, Math.max(0, employee.leaveBalance))
    const chargeableLeaves = Math.max(0, leaveDays - freeLeaves)
    const leaveDeduction = chargeableLeaves * dailyRate

    const coverages = payroll?.coveragesAsCovering ?? []
    const coverageBonus = coverages.reduce((sum, c) => {
      const days = differenceInCalendarDays(c.dateTo, c.dateFrom) + 1
      return sum + c.ratePerDay * days
    }, 0)

    const advances = payroll?.advances ?? []
    const advancesTotal = advances
      .filter((a) => a.type === 'CASH')
      .reduce((sum, a) => sum + a.amount, 0)
    const foodExpensesTotal = advances
      .filter((a) => a.type === 'FOOD')
      .reduce((sum, a) => sum + a.amount, 0)

    let securityDepositDeduction = 0
    let securityDepositRelease = 0
    if (employee.employeeType.isDepositEligible && employee.securityDeposit) {
      const deposit = employee.securityDeposit
      if (deposit.month1PayrollId === payroll?.id) {
        securityDepositDeduction = deposit.month1Withheld
      } else if (deposit.month2PayrollId === payroll?.id) {
        securityDepositDeduction = deposit.month2Withheld
      }
      if (deposit.releasedInPayrollId === payroll?.id) {
        securityDepositRelease = deposit.totalWithheld
      }
    }

    const festivalBonus = (payroll?.festivalBonuses ?? []).reduce(
      (sum, b) => sum + b.amount,
      0
    )
    const salaryHoldDeduction = holdsByEmployee.get(employee.id) ?? 0
    const salaryHoldRelease = (payroll?.salaryHoldReleases ?? []).reduce(
      (sum, h) => sum + h.amount,
      0
    )
    const amountPaid = payroll?.amountPaid ?? 0

    const grossEarned =
      baseEarned + coverageBonus + securityDepositRelease + festivalBonus + salaryHoldRelease
    const totalDeductions =
      leaveDeduction +
      advancesTotal +
      foodExpensesTotal +
      securityDepositDeduction +
      salaryHoldDeduction
    const netPayable = grossEarned - totalDeductions
    const remainingToPay = netPayable - amountPaid

    return {
      employeeId: employee.id,
      employeeName: employee.name,
      month: monthStart,
      viewType,
      baseSalary,
      dailyRate,
      workingDays,
      baseEarned,
      leaveDays,
      freeLeaves,
      leaveDeduction,
      coverageBonus,
      advancesTotal,
      foodExpensesTotal,
      securityDepositDeduction,
      securityDepositRelease,
      festivalBonus,
      salaryHoldDeduction,
      salaryHoldRelease,
      grossEarned,
      totalDeductions,
      netPayable,
      amountPaid,
      remainingToPay,
    }
  })

  return results
}

export type PayrollRosterSortField = 'name' | 'base' | 'net'

/**
 * Server-side search/sort/slice of a full monthly roster. Call `calculateMonthlyRoster` first
 * and pass the result; totals are computed over the filtered (searched) set, not only the page.
 */
export function buildPayrollRosterPage(
  all: PayrollCalculation[],
  opts: {
    q?: string
    sort: PayrollRosterSortField
    order: 'asc' | 'desc'
    page: number
    pageSize: number
  }
) {
  let rows = all
  const q = opts.q?.trim().toLowerCase()
  if (q) {
    rows = rows.filter((r) => r.employeeName.toLowerCase().includes(q))
  }
  const mult = opts.order === 'desc' ? -1 : 1
  const { sort } = opts
  rows = [...rows].sort((a, b) => {
    if (sort === 'name') return mult * a.employeeName.localeCompare(b.employeeName)
    if (sort === 'base') return mult * (a.baseEarned - b.baseEarned)
    return mult * (a.netPayable - b.netPayable)
  })
  const total = rows.length
  const start = (opts.page - 1) * opts.pageSize
  const pageRows = rows.slice(start, start + opts.pageSize)
  const totalNet = rows.reduce((s, r) => s + r.netPayable, 0)
  const totalPaid = rows.reduce((s, r) => s + r.amountPaid, 0)
  const totalRemaining = rows.reduce((s, r) => s + r.remainingToPay, 0)
  return {
    rows: pageRows,
    total,
    totals: { totalNet, totalPaid, totalRemaining },
  }
}
