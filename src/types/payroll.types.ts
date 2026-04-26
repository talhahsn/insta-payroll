export interface PayrollCalculation {
  employeeId: string
  employeeName: string
  month: Date
  viewType: 'LIVE' | 'EXPECTED'

  // Inputs
  baseSalary: number
  dailyRate: number
  workingDays: number        // Days used for base calculation

  // Earned
  baseEarned: number         // dailyRate × workingDays

  // Deductions
  leaveDays: number          // Total leave days (including half-days as 0.5)
  freeLeaves: number         // Leave balance consumed (max 1 per logic)
  leaveDeduction: number     // (leaveDays - freeLeaves) × dailyRate, min 0

  coverageBonus: number      // Extra pay for covering another employee

  advancesTotal: number      // Cash advances
  foodExpensesTotal: number  // Food expenses

  securityDepositDeduction: number  // This month's withholding
  securityDepositRelease: number    // Release on resignation (credit)

  festivalBonus: number
  salaryHoldDeduction: number        // Salary withheld this month
  salaryHoldRelease: number          // Withheld salary released this month

  // Summary
  grossEarned: number        // baseEarned + coverageBonus + securityDepositRelease + festivalBonus + salaryHoldRelease
  totalDeductions: number    // leaveDeduction + advancesTotal + foodExpensesTotal + securityDepositDeduction + salaryHoldDeduction
  netPayable: number         // grossEarned - totalDeductions
  amountPaid: number         // Already disbursed
  remainingToPay: number     // netPayable - amountPaid
}

export interface PayrollLineItem {
  label: string
  amount: number
  type: 'earning' | 'deduction' | 'neutral'
}
