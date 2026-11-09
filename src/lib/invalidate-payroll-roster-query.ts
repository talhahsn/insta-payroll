import type { QueryClient } from '@tanstack/react-query'

/** Invalidate client TanStack Query cache for payroll roster lists. */
export function invalidatePayrollRosterQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: ['payrollRoster'] })
}
