import type { AuthUser } from '@/types/auth.types'

export const PERMISSIONS = {
  EMPLOYEES_VIEW:           'employees.view',
  EMPLOYEES_VIEW_ALL:       'employees.view_all',
  EMPLOYEES_MANAGE:         'employees.manage',
  PAYROLL_VIEW:             'payroll.view',
  PAYROLL_RECORD_PAYMENT:   'payroll.record_payment',
  PAYROLL_EXPORT:           'payroll.export',
  LEAVES_VIEW:              'leaves.view',
  LEAVES_MANAGE:            'leaves.manage',
  ADVANCES_VIEW:            'advances.view',
  ADVANCES_MANAGE:          'advances.manage',
  COVERAGE_VIEW:            'coverage.view',
  COVERAGE_MANAGE:          'coverage.manage',
  FESTIVALS_VIEW:           'festivals.view',
  FESTIVALS_MANAGE:         'festivals.manage',
  SETTINGS_VIEW:            'settings.view',
  SETTINGS_MANAGE:          'settings.manage',
} as const

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS]

export function can(user: AuthUser, resource: string, action: string): boolean {
  return user.permissions.includes(`${resource}.${action}`)
}

/** Route → required permission mapping for the app layout guard */
export const ROUTE_PERMISSIONS: Record<string, Permission> = {
  '/employees':  PERMISSIONS.EMPLOYEES_VIEW,
  '/payroll':    PERMISSIONS.PAYROLL_VIEW,
  '/leaves':     PERMISSIONS.LEAVES_VIEW,
  '/advances':   PERMISSIONS.ADVANCES_VIEW,
  '/coverage':   PERMISSIONS.COVERAGE_VIEW,
  '/festivals':  PERMISSIONS.FESTIVALS_VIEW,
  '/settings':   PERMISSIONS.SETTINGS_VIEW,
}
