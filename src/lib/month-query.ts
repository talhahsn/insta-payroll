import { startOfMonth } from 'date-fns'

/**
 * Parse `?month=YYYY-MM` from the URL as the **local** first day of that month.
 * `new Date("2026-03")` is interpreted as UTC and breaks Prisma `month` matches
 * against rows created with `new Date(y, m - 1, 1)` (e.g. migrations / ledger script).
 */
export function parseMonthFromQuery(monthParam: string | undefined | null): Date {
  if (!monthParam) return startOfMonth(new Date())
  const m = /^(\d{4})-(\d{1,2})/.exec(monthParam.trim())
  if (m) {
    const y = Number(m[1])
    const mo = Number(m[2])
    if (y >= 1970 && y <= 2100 && mo >= 1 && mo <= 12) {
      return startOfMonth(new Date(y, mo - 1, 1))
    }
  }
  return startOfMonth(new Date(monthParam))
}
