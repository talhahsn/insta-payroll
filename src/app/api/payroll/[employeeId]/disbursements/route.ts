import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { toApiError, AppError } from '@/lib/errors'
import { getOrCreateMonthlyPayroll } from '@/repositories/payroll.repository'
import { prisma } from '@/lib/prisma'
import { startOfMonth } from 'date-fns'

const schema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  amount: z.number().positive(),
  paidAt: z.string(),
  notes: z.string().optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!can(user, 'payroll', 'record_payment')) throw new AppError('FORBIDDEN', 'Permission denied')

    const { employeeId } = await params
    const body = schema.parse(await req.json())

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, restaurantId: user.restaurantId },
    })
    if (!employee) throw new AppError('NOT_FOUND', 'Employee not found')

    const month = startOfMonth(new Date(body.month))
    const payroll = await getOrCreateMonthlyPayroll(employeeId, month, user.restaurantId)

    const disbursement = await prisma.$transaction(async (tx) => {
      const d = await tx.disbursement.create({
        data: {
          monthlyPayrollId: payroll.id,
          amount: body.amount,
          paidAt: new Date(body.paidAt),
          notes: body.notes,
          recordedById: user.id,
          restaurantId: user.restaurantId,
        },
      })

      const agg = await tx.disbursement.aggregate({
        where: { monthlyPayrollId: payroll.id },
        _sum: { amount: true },
      })
      const totalPaid = agg._sum.amount ?? 0

      await tx.monthlyPayroll.update({
        where: { id: payroll.id },
        data: { amountPaid: totalPaid },
      })

      return d
    })

    return NextResponse.json(disbursement, { status: 201 })
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}
