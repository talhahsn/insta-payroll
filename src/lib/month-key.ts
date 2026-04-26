/**
 * Canonical month key used by DB records keyed on "employeeId + month".
 *
 * Existing data in this project stores month keys at Pakistan midnight
 * represented in UTC (e.g. 2026-03-31 19:00:00 for April 2026).
 * We keep this convention stable across environments (local/Vercel)
 * so lookups do not depend on server timezone.
 */
const PKT_OFFSET_HOURS = 5

export function toMonthKey(date: Date): Date {
  const y = date.getFullYear()
  const m = date.getMonth()
  // 00:00 PKT on first day of month, represented as UTC instant.
  return new Date(Date.UTC(y, m, 1, -PKT_OFFSET_HOURS, 0, 0, 0))
}

export function monthKeyFromYearMonth(year: number, month1To12: number): Date {
  return new Date(Date.UTC(year, month1To12 - 1, 1, -PKT_OFFSET_HOURS, 0, 0, 0))
}
