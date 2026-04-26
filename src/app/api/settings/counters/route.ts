import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { toApiError, AppError } from '@/lib/errors'
import { prisma } from '@/lib/prisma'

const schema = z.object({ name: z.string().min(1) })

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!can(user, 'settings', 'manage')) throw new AppError('FORBIDDEN', 'Permission denied')
    const counters = await prisma.counter.findMany({
      where: { restaurantId: user.restaurantId },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(counters)
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!can(user, 'settings', 'manage')) throw new AppError('FORBIDDEN', 'Permission denied')
    const { name } = schema.parse(await req.json())
    const counter = await prisma.counter.create({
      data: { name, restaurantId: user.restaurantId },
    })
    return NextResponse.json(counter, { status: 201 })
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}
