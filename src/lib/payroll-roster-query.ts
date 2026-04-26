import { format } from 'date-fns'

export type PayrollRosterSort = 'name' | 'base' | 'net'

type RosterAll = {
  month: Date
  monthParam: string
  viewType: 'LIVE' | 'EXPECTED'
  all: true
}

type RosterPaged = {
  month: Date
  monthParam: string
  viewType: 'LIVE' | 'EXPECTED'
  page: number
  pageSize: number
  sort: PayrollRosterSort
  order: 'asc' | 'desc'
  q?: string
  all?: false
}

/**
 * Build search params for `GET /api/payroll/roster` (paged roster, or `all=1` for full export).
 */
export function buildPayrollRosterSearchParams(opts: RosterAll | RosterPaged): URLSearchParams {
  const monthStr = opts.monthParam || format(opts.month, 'yyyy-MM')
  if (opts.all) {
    return new URLSearchParams({ month: monthStr, view: opts.viewType, all: '1' })
  }
  const p = new URLSearchParams({
    month: monthStr,
    view: opts.viewType,
    page: String(opts.page),
    pageSize: String(opts.pageSize),
    sort: opts.sort,
    order: opts.order,
  })
  if (opts.q?.trim()) p.set('q', opts.q.trim())
  return p
}
