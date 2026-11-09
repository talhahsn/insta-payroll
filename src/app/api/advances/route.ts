import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth'
import { toApiError } from '@/lib/errors'
import { revalidatePayrollRoster } from '@/lib/payroll-roster-cache'
import * as service from '@/services/advance.service'
import { parseMonthFromQuery } from '@/lib/month-query'

const createSchema = z.object({
  employeeId: z.string(),
  amount: z.number().positive(),
  type: z.enum(['CASH', 'FOOD']),
  date: z.string().transform((v) => new Date(v)),
  notes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser()
    const monthParam = req.nextUrl.searchParams.get('month')
    const monthDate = monthParam ? parseMonthFromQuery(monthParam) : undefined
    const advances = await service.getAdvances(user, monthDate)
    return NextResponse.json(advances)
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser()
    const body = createSchema.parse(await req.json())
    const advance = await service.createAdvance(body, user)
    revalidatePayrollRoster(user.restaurantId)
    return NextResponse.json(advance, { status: 201 })
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}
