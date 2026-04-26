import { NextRequest, NextResponse } from 'next/server'
import { startOfMonth } from 'date-fns'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth'
import { parseMonthFromQuery } from '@/lib/month-query'
import { toApiError } from '@/lib/errors'
import { can } from '@/lib/permissions'
import {
  buildPayrollRosterPage,
  calculateMonthlyRoster,
  type PayrollRosterSortField,
} from '@/services/payroll.service'

const sortSchema = z.enum(['name', 'base', 'net'])

/**
 * GET — paged / filtered payroll roster for a month.
 * Query: month, view=EXPECTED|LIVE, q, sort=name|base|net, order=asc|desc, page, pageSize
 * When all=1: full filtered+sorted roster (e.g. PDF export).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!can(user, 'payroll', 'view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const sp = req.nextUrl.searchParams
    const monthParam = sp.get('month') ?? ''
    const month = parseMonthFromQuery(monthParam || undefined)
    const viewType = sp.get('view') === 'EXPECTED' ? 'EXPECTED' : 'LIVE'
    const canViewAll = can(user, 'employees', 'view_all')

    const full = await calculateMonthlyRoster(month, viewType, user.restaurantId, canViewAll)

    const all = sp.get('all') === '1' || sp.get('all') === 'true'
    const q = sp.get('q') ?? undefined
    const sort = (sortSchema.safeParse(sp.get('sort')).data ?? 'name') as PayrollRosterSortField
    const order = sp.get('order') === 'desc' ? 'desc' : 'asc'

    if (all) {
      const out = buildPayrollRosterPage(full, {
        q,
        sort,
        order,
        page: 1,
        pageSize: 1_000_000,
      })
      return NextResponse.json({
        rows: out.rows,
        total: out.total,
        totals: out.totals,
        month: startOfMonth(month).toISOString(),
        viewType,
      })
    }

    const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1)
    const pageSize = Math.min(200, Math.max(1, parseInt(sp.get('pageSize') ?? '25', 10) || 25))

    const { rows, total, totals } = buildPayrollRosterPage(full, {
      q,
      sort,
      order,
      page,
      pageSize,
    })
    return NextResponse.json({ rows, total, totals, page, pageSize, month: startOfMonth(month).toISOString(), viewType })
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}
