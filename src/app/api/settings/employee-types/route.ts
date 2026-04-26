import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { toApiError, AppError } from '@/lib/errors'
import { prisma } from '@/lib/prisma'

const schema = z.object({
  name: z.string().min(1),
  isDailyRate: z.boolean().default(true),
  isLeaveEligible: z.boolean().default(true),
  isDepositEligible: z.boolean().default(true),
  isHiddenFromManager: z.boolean().default(false),
  hasBillingCycle: z.boolean().default(false),
})

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!can(user, 'settings', 'manage')) throw new AppError('FORBIDDEN', 'Permission denied')
    const types = await prisma.employeeType.findMany({
      where: { restaurantId: user.restaurantId },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(types)
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!can(user, 'settings', 'manage')) throw new AppError('FORBIDDEN', 'Permission denied')
    const body = schema.parse(await req.json())
    const type = await prisma.employeeType.create({
      data: { ...body, restaurantId: user.restaurantId },
    })
    return NextResponse.json(type, { status: 201 })
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}
