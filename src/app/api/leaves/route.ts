import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth'
import { toApiError } from '@/lib/errors'
import { revalidatePayrollRoster } from '@/lib/payroll-roster-cache'
import * as service from '@/services/leave.service'
import { parseMonthFromQuery } from '@/lib/month-query'

const createSchema = z.object({
  employeeId: z.string(),
  dateFrom: z.string().transform((v) => new Date(v)),
  dateTo: z.string().transform((v) => new Date(v)),
  isHalfDay: z.boolean().default(false),
  notes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser()
    const monthParam = req.nextUrl.searchParams.get('month')
    const monthDate = monthParam ? parseMonthFromQuery(monthParam) : undefined
    const leaves = await service.getLeaves(user, monthDate)
    return NextResponse.json(leaves)
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser()
    const body = createSchema.parse(await req.json())
    const leave = await service.createLeave(body, user)
    revalidatePayrollRoster(user.restaurantId)
    return NextResponse.json(leave, { status: 201 })
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}
