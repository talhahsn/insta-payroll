import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth'
import { toApiError } from '@/lib/errors'
import * as service from '@/services/festival.service'
import { parseYearMonthToLocalDate } from '@/lib/month-key'

const createSchema = z.object({
  name: z.string().min(1),
  eventDate: z.string().transform((v) => new Date(v)),
  bonusType: z.enum(['FIXED', 'DAYS_SALARY']),
  bonusValue: z.number().positive(),
  appliesToMonth: z.string().transform((v, ctx) => {
    const parsed = parseYearMonthToLocalDate(v)
    if (!parsed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid appliesToMonth format. Use YYYY-MM.',
      })
      return z.NEVER
    }
    return parsed
  }),
})

export async function GET() {
  try {
    const user = await getAuthUser()
    const events = await service.getFestivalEvents(user)
    return NextResponse.json(events)
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser()
    const body = createSchema.parse(await req.json())
    const event = await service.createFestivalEvent(body, user)
    return NextResponse.json(event, { status: 201 })
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}
