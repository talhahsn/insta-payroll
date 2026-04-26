export type PagedEmployeeStatus = 'active' | 'inactive' | 'all'
export type PagedEmployeeSort = 'name' | 'salary' | 'joined'

export function buildPagedEmployeesSearchParams(opts: {
  status: PagedEmployeeStatus
  page: number
  pageSize: number
  sort: PagedEmployeeSort
  order: 'asc' | 'desc'
  q?: string
}): URLSearchParams {
  const p = new URLSearchParams({
    paged: '1',
    status: opts.status,
    page: String(opts.page),
    pageSize: String(opts.pageSize),
    sort: opts.sort,
    order: opts.order,
  })
  if (opts.q?.trim()) p.set('q', opts.q.trim())
  return p
}
