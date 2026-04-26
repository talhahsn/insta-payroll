/**
 * Normalize API `joinedAt` (ISO string, or `Date` if ever passed in-memory) for display keys.
 */
export function toIsoDateString(v: unknown): string {
  if (typeof v === 'string') return v
  if (v instanceof Date) return v.toISOString()
  if (v != null && typeof (v as { toISOString?: () => string }).toISOString === 'function') {
    return (v as Date).toISOString()
  }
  return new Date(String(v)).toISOString()
}
