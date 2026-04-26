import type { Restaurant } from '@prisma/client'

export interface AuthUser {
  id: string
  supabaseUid: string
  email: string
  name: string
  roleId: string
  roleName: string
  isProtectedRole: boolean   // true for Super Admin
  permissions: string[]
  restaurantId: string
  restaurant: Restaurant
}
