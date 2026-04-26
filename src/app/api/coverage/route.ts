import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth'
import { toApiError } from '@/lib/errors'
import * as service from '@/services/coverage.service'
import { parseMonthFromQuery } from '@/lib/month-query'

const createSchema = z.object({
  absentEmployeeId: z.string(),
  coveringEmployeeId: z.string(),
  counterId: z.string(),
  dateFrom: z.string().transform((v) => new Date(v)),
  dateTo: z.string().transform((v) => new Date(v)),
  ratePerDay: z.number().positive(),
})

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser()
    const monthParam = req.nextUrl.searchParams.get('month')
    const monthDate = monthParam ? parseMonthFromQuery(monthParam) : undefined
    const coverages = await service.getCoverages(user, monthDate)
    return NextResponse.json(coverages)
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser()
    const body = createSchema.parse(await req.json())
    const coverage = await service.createCoverage(body, user)
    return NextResponse.json(coverage, { status: 201 })
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}
