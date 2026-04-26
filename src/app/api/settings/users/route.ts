import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { toApiError, AppError } from '@/lib/errors'
import { prisma } from '@/lib/prisma'
import { createAdminClient } from '@/lib/supabase/admin'

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  roleId: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!can(user, 'settings', 'manage')) throw new AppError('FORBIDDEN', 'Permission denied')

    const { name, email, password, roleId } = schema.parse(await req.json())

    // Validate role belongs to this restaurant
    const role = await prisma.role.findFirst({
      where: { id: roleId, restaurantId: user.restaurantId },
    })
    if (!role) throw new AppError('NOT_FOUND', 'Role not found')

    // Non-Super-Admin cannot assign protected roles
    if (role.isProtected && !user.isProtectedRole) {
      throw new AppError('FORBIDDEN', 'Cannot assign Super Admin role')
    }

    const supabase = createAdminClient()
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError || !authData.user) {
      throw new AppError('VALIDATION', authError?.message ?? 'Failed to create auth user')
    }

    try {
      const newUser = await prisma.user.create({
        data: {
          supabaseUid: authData.user.id,
          email,
          name,
          roleId,
          restaurantId: user.restaurantId,
        },
        include: { role: true },
      })
      return NextResponse.json(newUser, { status: 201 })
    } catch (dbError) {
      // Rollback Supabase user
      try {
        await supabase.auth.admin.deleteUser(authData.user.id)
      } catch (rollbackErr) {
        console.error('[add-user-rollback-failed]', {
          supabaseUserId: authData.user.id,
          error: rollbackErr,
          timestamp: new Date().toISOString(),
        })
      }
      throw dbError
    }
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}
