import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { toApiError } from '@/lib/errors'
import { can } from '@/lib/permissions'
import { AppError } from '@/lib/errors'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { startOfMonth } from 'date-fns'

const createSchema = z.object({
  employeeId: z.string(),
  days: z.number().positive(),
  ratePerDay: z.number().positive(),
  reason: z.string().optional(),
  heldForMonth: z.string().transform((v) => startOfMonth(new Date(v))),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!can(user, 'employees', 'manage')) throw new AppError('FORBIDDEN', 'Permission denied')

    const body = createSchema.parse(await req.json())

    const employee = await prisma.employee.findFirst({
      where: { id: body.employeeId, restaurantId: user.restaurantId },
    })
    if (!employee) throw new AppError('NOT_FOUND', 'Employee not found')

    const hold = await prisma.salaryHold.create({
      data: {
        employeeId: body.employeeId,
        restaurantId: user.restaurantId,
        days: body.days,
        ratePerDay: body.ratePerDay,
        amount: body.days * body.ratePerDay,
        reason: body.reason,
        heldForMonth: body.heldForMonth,
      },
    })
    return NextResponse.json(hold, { status: 201 })
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}
