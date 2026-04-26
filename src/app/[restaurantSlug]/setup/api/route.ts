import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createAdminClient } from '@/lib/supabase/admin'
import { toApiError, AppError } from '@/lib/errors'

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ restaurantSlug: string }> }
) {
  try {
    const { restaurantSlug } = await params

    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: restaurantSlug },
    })
    if (!restaurant) throw new AppError('NOT_FOUND', 'Restaurant not found')

    const userCount = await prisma.user.count({
      where: { restaurantId: restaurant.id },
    })
    if (userCount > 0) throw new AppError('CONFLICT', 'Restaurant already has users — please log in')

    const { name, email, password } = schema.parse(await req.json())

    // Create Super Admin + Admin roles for this restaurant
    const [superAdminRole] = await prisma.$transaction(async (tx) => {
      const superAdmin = await tx.role.create({
        data: {
          name: 'Super Admin',
          description: 'Full access to all features',
          isProtected: true,
          restaurantId: restaurant.id,
          permissions: {
            create: [
              'employees.view', 'employees.view_all', 'employees.manage',
              'payroll.view', 'payroll.record_payment', 'payroll.export',
              'leaves.view', 'leaves.manage',
              'advances.view', 'advances.manage',
              'coverage.view', 'coverage.manage',
              'festivals.view', 'festivals.manage',
              'settings.view', 'settings.manage',
            ].map((perm) => ({
              resource: perm.split('.')[0],
              action: perm.split('.')[1],
            })),
          },
        },
      })

      await tx.role.create({
        data: {
          name: 'Admin',
          description: 'Manage daily operations',
          isProtected: false,
          restaurantId: restaurant.id,
          permissions: {
            create: [
              'employees.view', 'employees.manage',
              'payroll.view',
              'leaves.view', 'leaves.manage',
              'advances.view', 'advances.manage',
              'coverage.view', 'coverage.manage',
              'festivals.view',
            ].map((perm) => ({
              resource: perm.split('.')[0],
              action: perm.split('.')[1],
            })),
          },
        },
      })

      return [superAdmin]
    })

    // Create Supabase auth user
    const supabase = createAdminClient()
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError || !authData.user) {
      // Roll back roles (they have no users yet so safe to delete)
      await prisma.role.deleteMany({ where: { restaurantId: restaurant.id } })
      throw new AppError('VALIDATION', authError?.message ?? 'Failed to create auth user')
    }

    // Create DB User record
    try {
      await prisma.user.create({
        data: {
          supabaseUid: authData.user.id,
          email,
          name,
          roleId: superAdminRole.id,
          restaurantId: restaurant.id,
        },
      })
    } catch (dbError) {
      // Rollback: delete the Supabase user
      try {
        await supabase.auth.admin.deleteUser(authData.user.id)
      } catch (rollbackErr) {
        console.error('[setup-rollback-failed]', {
          supabaseUserId: authData.user.id,
          error: rollbackErr,
          timestamp: new Date().toISOString(),
        })
      }
      throw dbError
    }

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}
