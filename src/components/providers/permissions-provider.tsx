'use client'

import { createContext, useContext } from 'react'

export type RestaurantContextValue = {
  id: string
  name: string
  phone: string | null
  address: string | null
  logoUrl: string | null
}

interface PermissionsContextValue {
  permissions: string[]
  roleId: string
  roleName: string
  isProtectedRole: boolean
  restaurant: RestaurantContextValue
}

const emptyRestaurant: RestaurantContextValue = {
  id: '',
  name: '',
  phone: null,
  address: null,
  logoUrl: null,
}

const PermissionsContext = createContext<PermissionsContextValue>({
  permissions: [],
  roleId: '',
  roleName: '',
  isProtectedRole: false,
  restaurant: emptyRestaurant,
})

export function PermissionsProvider({
  permissions,
  roleId,
  roleName,
  isProtectedRole,
  restaurant,
  children,
}: PermissionsContextValue & { children: React.ReactNode }) {
  return (
    <PermissionsContext.Provider
      value={{ permissions, roleId, roleName, isProtectedRole, restaurant }}
    >
      {children}
    </PermissionsContext.Provider>
  )
}

export function usePermissions() {
  return useContext(PermissionsContext)
}

export function useRestaurant() {
  return useContext(PermissionsContext).restaurant
}

export function useCan(resource: string, action: string): boolean {
  const { permissions } = usePermissions()
  return permissions.includes(`${resource}.${action}`)
}
