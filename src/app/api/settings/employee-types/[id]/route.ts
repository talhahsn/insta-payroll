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
    const type = await prisma.employeeType.findFirst({
      where: { id, restaurantId: user.restaurantId },
    })
    if (!type) throw new AppError('NOT_FOUND', 'Employee type not found')
    const inUse = await prisma.employee.count({ where: { employeeTypeId: id } })
    if (inUse > 0) throw new AppError('CONFLICT', `Cannot delete — ${inUse} employee(s) use this type`)
    await prisma.employeeType.delete({ where: { id } })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}
