/**
 * Canonical month key used by DB records keyed on "employeeId + month".
 *
 * Existing data in this project stores month keys at Pakistan midnight
 * represented in UTC (e.g. 2026-03-31 19:00:00 for April 2026).
 * We keep this convention stable across environments (local/Vercel)
 * so lookups do not depend on server timezone.
 */
const PKT_OFFSET_HOURS = 5
const HOUR_MS = 60 * 60 * 1000

export function toMonthKey(date: Date): Date {
  // Read month in Pakistan time regardless of runtime timezone.
  const pkt = new Date(date.getTime() + PKT_OFFSET_HOURS * HOUR_MS)
  const y = pkt.getUTCFullYear()
  const m = pkt.getUTCMonth()
  // 00:00 PKT on first day of month, represented as UTC instant.
  return new Date(Date.UTC(y, m, 1, -PKT_OFFSET_HOURS, 0, 0, 0))
}

export function monthKeyFromYearMonth(year: number, month1To12: number): Date {
  return new Date(Date.UTC(year, month1To12 - 1, 1, -PKT_OFFSET_HOURS, 0, 0, 0))
}

/**
 * Parse YYYY-MM into a local Date at month start.
 * This avoids timezone surprises from `new Date("YYYY-MM")` parsing as UTC.
 */
export function parseYearMonthToLocalDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{1,2})$/.exec(value.trim())
  if (!m) return null
  const year = Number(m[1])
  const month1To12 = Number(m[2])
  if (year < 1970 || year > 2100 || month1To12 < 1 || month1To12 > 12) return null
  return new Date(year, month1To12 - 1, 1)
}

/**
 * Convert month-like user input into canonical month key.
 * Accepts YYYY-MM (preferred) and falls back to JS Date parsing for older payloads.
 */
export function monthKeyFromInput(value: string): Date {
  const monthDate = parseYearMonthToLocalDate(value)
  if (monthDate) return toMonthKey(monthDate)
  return toMonthKey(new Date(value))
}
