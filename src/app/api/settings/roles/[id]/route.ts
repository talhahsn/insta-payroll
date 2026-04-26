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
    const role = await prisma.jobRole.findFirst({
      where: { id, restaurantId: user.restaurantId },
    })
    if (!role) throw new AppError('NOT_FOUND', 'Job title not found')
    const inUse = await prisma.employeeJobRole.count({ where: { jobRoleId: id } })
    if (inUse > 0) throw new AppError('CONFLICT', `Cannot delete — ${inUse} employee(s) use this job title`)
    await prisma.jobRole.delete({ where: { id } })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}
