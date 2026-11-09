import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { AppError } from '@/lib/errors'
import type { AuthUser } from '@/types/auth.types'

/**
 * Get the current authenticated user with their DB profile, role, and permissions.
 * Throws UNAUTHORIZED if not logged in, NOT_FOUND if user record missing.
 *
 * Wrapped in React `cache()` so layout + page share one Supabase+Prisma hit per request.
 */
export const getAuthUser = cache(async (): Promise<AuthUser> => {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new AppError('UNAUTHORIZED', 'Not authenticated')
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseUid: user.id },
    include: {
      restaurant: true,
      role: {
        include: { permissions: true },
      },
    },
  })

  if (!dbUser) {
    throw new AppError('NOT_FOUND', 'User profile not found')
  }

  return {
    id: dbUser.id,
    supabaseUid: dbUser.supabaseUid,
    email: dbUser.email,
    name: dbUser.name,
    roleId: dbUser.roleId,
    roleName: dbUser.role.name,
    isProtectedRole: dbUser.role.isProtected,
    permissions: dbUser.role.permissions.map((p) => `${p.resource}.${p.action}`),
    restaurantId: dbUser.restaurantId,
    restaurant: dbUser.restaurant,
  }
})
