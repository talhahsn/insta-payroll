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
    const counter = await prisma.counter.findFirst({
      where: { id, restaurantId: user.restaurantId },
    })
    if (!counter) throw new AppError('NOT_FOUND', 'Counter not found')
    const inUse = await prisma.shiftCoverage.count({ where: { counterId: id } })
    if (inUse > 0) throw new AppError('CONFLICT', `Cannot delete — counter has ${inUse} coverage record(s)`)
    await prisma.counter.delete({ where: { id } })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}
