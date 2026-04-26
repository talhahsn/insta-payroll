import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { toApiError, AppError } from '@/lib/errors'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!can(user, 'settings', 'manage')) throw new AppError('FORBIDDEN', 'Permission denied')

    const { id } = await params
    const role = await prisma.role.findFirst({
      where: { id, restaurantId: user.restaurantId },
      include: { _count: { select: { users: true } } },
    })
    if (!role) throw new AppError('NOT_FOUND', 'Role not found')
    if (role.isProtected) throw new AppError('FORBIDDEN', 'Cannot delete a protected role')
    if (role._count.users > 0) {
      throw new AppError('CONFLICT', `Cannot delete — ${role._count.users} user(s) are assigned to this role`)
    }

    await prisma.role.delete({ where: { id } })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}
