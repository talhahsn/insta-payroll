import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { toApiError, AppError } from '@/lib/errors'
import { prisma } from '@/lib/prisma'

const schema = z.object({
  roleId: z.string().min(1),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!can(user, 'settings', 'manage')) throw new AppError('FORBIDDEN', 'Permission denied')

    const { id } = await params
    if (id === user.id) throw new AppError('CONFLICT', 'Cannot change your own role')

    const target = await prisma.user.findFirst({
      where: { id, restaurantId: user.restaurantId },
      include: { role: true },
    })
    if (!target) throw new AppError('NOT_FOUND', 'User not found')

    // Non-Super-Admin cannot edit Super Admin users
    if (target.role.isProtected && !user.isProtectedRole) {
      throw new AppError('FORBIDDEN', 'Cannot edit Super Admin users')
    }

    const { roleId } = schema.parse(await req.json())

    // Validate the target role belongs to this restaurant
    const newRole = await prisma.role.findFirst({
      where: { id: roleId, restaurantId: user.restaurantId },
    })
    if (!newRole) throw new AppError('NOT_FOUND', 'Role not found')

    // Non-Super-Admin cannot assign protected roles
    if (newRole.isProtected && !user.isProtectedRole) {
      throw new AppError('FORBIDDEN', 'Cannot assign Super Admin role')
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { roleId },
      include: { role: true },
    })
    return NextResponse.json(updated)
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!can(user, 'settings', 'manage')) throw new AppError('FORBIDDEN', 'Permission denied')

    const { id } = await params
    if (id === user.id) throw new AppError('CONFLICT', 'Cannot delete your own account')

    const target = await prisma.user.findFirst({
      where: { id, restaurantId: user.restaurantId },
      include: { role: true },
    })
    if (!target) throw new AppError('NOT_FOUND', 'User not found')

    if (target.role.isProtected && !user.isProtectedRole) {
      throw new AppError('FORBIDDEN', 'Cannot delete Super Admin users')
    }

    await prisma.user.delete({ where: { id } })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}
