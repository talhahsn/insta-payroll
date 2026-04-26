'use client'

import { createContext, useContext } from 'react'

interface PermissionsContextValue {
  permissions: string[]
  roleId: string
  roleName: string
  isProtectedRole: boolean
}

const PermissionsContext = createContext<PermissionsContextValue>({
  permissions: [],
  roleId: '',
  roleName: '',
  isProtectedRole: false,
})

export function PermissionsProvider({
  permissions,
  roleId,
  roleName,
  isProtectedRole,
  children,
}: PermissionsContextValue & { children: React.ReactNode }) {
  return (
    <PermissionsContext.Provider value={{ permissions, roleId, roleName, isProtectedRole }}>
      {children}
    </PermissionsContext.Provider>
  )
}

export function usePermissions() {
  return useContext(PermissionsContext)
}

export function useCan(resource: string, action: string): boolean {
  const { permissions } = usePermissions()
  return permissions.includes(`${resource}.${action}`)
}
