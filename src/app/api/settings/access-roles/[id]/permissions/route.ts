import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { toApiError, AppError } from '@/lib/errors'
import { prisma } from '@/lib/prisma'

const schema = z.object({
  permissions: z.array(z.string()),
})

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!can(user, 'settings', 'manage')) throw new AppError('FORBIDDEN', 'Permission denied')

    const { id } = await params
    const role = await prisma.role.findFirst({
      where: { id, restaurantId: user.restaurantId },
    })
    if (!role) throw new AppError('NOT_FOUND', 'Role not found')

    // Only Super Admin can edit protected roles
    if (role.isProtected && !user.isProtectedRole) {
      throw new AppError('FORBIDDEN', 'Cannot edit permissions of a protected role')
    }

    const { permissions } = schema.parse(await req.json())

    // Replace all permissions atomically
    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId: id } }),
      prisma.rolePermission.createMany({
        data: permissions.map((perm) => ({
          roleId: id,
          resource: perm.split('.')[0],
          action: perm.split('.')[1],
        })),
      }),
    ])

    return NextResponse.json({ ok: true })
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}
