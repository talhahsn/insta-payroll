import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { toApiError } from '@/lib/errors'
import { can } from '@/lib/permissions'
import { AppError } from '@/lib/errors'
import { revalidatePayrollRoster } from '@/lib/payroll-roster-cache'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { monthKeyFromInput } from '@/lib/month-key'

const releaseSchema = z.object({
  action: z.literal('release'),
  month: z.string().transform(monthKeyFromInput),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser()
    if (!can(user, 'employees', 'manage')) throw new AppError('FORBIDDEN', 'Permission denied')

    const { id } = await params
    const body = releaseSchema.parse(await req.json())

    const hold = await prisma.salaryHold.findFirst({
      where: { id, restaurantId: user.restaurantId },
    })
    if (!hold) throw new AppError('NOT_FOUND', 'Salary hold not found')
    if (hold.releasedInPayrollId) throw new AppError('VALIDATION', 'Already released')

    // Ensure payroll record exists for target month
    const payroll = await prisma.monthlyPayroll.upsert({
      where: { employeeId_month: { employeeId: hold.employeeId, month: body.month } },
      create: {
        employeeId: hold.employeeId,
        month: body.month,
        baseSalary: (await prisma.employee.findUniqueOrThrow({
          where: { id: hold.employeeId },
          select: { currentSalary: true },
        })).currentSalary,
        restaurantId: user.restaurantId,
      },
      update: {},
    })

    const updated = await prisma.salaryHold.update({
      where: { id },
      data: {
        releasedInPayrollId: payroll.id,
        releasedAt: new Date(),
      },
    })
    revalidatePayrollRoster(user.restaurantId)
    return NextResponse.json(updated)
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser()
    if (!can(user, 'employees', 'manage')) throw new AppError('FORBIDDEN', 'Permission denied')

    const { id } = await params
    const hold = await prisma.salaryHold.findFirst({
      where: { id, restaurantId: user.restaurantId },
    })
    if (!hold) throw new AppError('NOT_FOUND', 'Salary hold not found')
    if (hold.releasedInPayrollId) throw new AppError('VALIDATION', 'Cannot delete a released hold')

    await prisma.salaryHold.delete({ where: { id } })
    revalidatePayrollRoster(user.restaurantId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}
