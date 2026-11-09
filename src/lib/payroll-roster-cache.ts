import { revalidateTag } from 'next/cache'

/** Cache tag for the full monthly roster computation (unstable_cache). */
export function payrollRosterTag(restaurantId: string): string {
  return `payroll-roster:${restaurantId}`
}

/** Invalidate server-side roster cache after payroll-affecting mutations. */
export function revalidatePayrollRoster(restaurantId: string) {
  revalidateTag(payrollRosterTag(restaurantId), { expire: 0 })
}
