'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type SortingState,
} from '@tanstack/react-table'
import { format } from 'date-fns'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataTablePagination, DEFAULT_TABLE_PAGE_SIZE } from '@/components/data-table/data-table-pagination'
import { TABLE_HEADER_STICKY } from '@/components/ui/table-header-classname'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { getErrorMessageFromResponse } from '@/lib/api-client'
import { toIsoDateString } from '@/lib/dates'
import { formatPkr } from '@/lib/format-money'
import { buildPagedEmployeesSearchParams, type PagedEmployeeSort } from '@/lib/employee-list-query'
import { cn } from '@/lib/utils'
import type { PagedEmployeeRow } from '@/types/employee-list'
import { UserX } from 'lucide-react'
import { DataTableSkeleton } from '@/components/ui/data-table-skeleton'

type StatusFilter = 'active' | 'inactive' | 'all'
type EmpRow = PagedEmployeeRow

function toApiStatus(s: StatusFilter): 'active' | 'inactive' | 'all' {
  if (s === 'all') return 'all'
  if (s === 'inactive') return 'inactive'
  return 'active'
}

function sortIdToParam(sort: SortingState[0] | undefined): { sort: PagedEmployeeSort; order: 'asc' | 'desc' } {
  if (!sort) return { sort: 'name', order: 'asc' }
  const id = sort.id
  const desc = sort.desc
  if (id === 'currentSalary') return { sort: 'salary', order: desc ? 'desc' : 'asc' }
  if (id === 'joinedAt') return { sort: 'joined', order: desc ? 'desc' : 'asc' }
  return { sort: 'name', order: desc ? 'desc' : 'asc' }
}

async function fetchEmployeesPage(params: URLSearchParams) {
  const res = await fetch(`/api/employees?${params.toString()}`, { credentials: 'include' })
  if (!res.ok) {
    const msg = await getErrorMessageFromResponse(res)
    throw new Error(msg || 'Failed to load employees')
  }
  return res.json() as Promise<{ employees: unknown[]; total: number }>
}

export function EmployeesDataTable({ status, canManage }: { status: StatusFilter; canManage: boolean }) {
  void canManage
  const [q, setQ] = useState('')
  const qDebounced = useDebouncedValue(q, 300)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_TABLE_PAGE_SIZE,
  })

  const { sort, order } = sortIdToParam(sorting[0])

  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }, [qDebounced])

  const { data, isFetching, isError, error, isPlaceholderData, refetch, isPending } = useQuery({
    queryKey: [
      'employees',
      'paged',
      status,
      qDebounced,
      pagination.pageIndex,
      pagination.pageSize,
      sort,
      order,
    ] as const,
    queryFn: async () => {
      const { pageIndex, pageSize } = pagination
      const params = buildPagedEmployeesSearchParams({
        status: toApiStatus(status),
        page: pageIndex + 1,
        pageSize,
        sort,
        order,
        q: qDebounced,
      })
      return fetchEmployeesPage(params)
    },
    placeholderData: keepPreviousData,
  })

  const { rows, total } = useMemo(() => {
    if (!data?.employees) return { rows: [] as EmpRow[], total: 0 }
    const out: EmpRow[] = data.employees.map((raw) => {
      const e = raw as EmpRow
      return { ...e, joinedAt: toIsoDateString((raw as { joinedAt: unknown }).joinedAt) }
    })
    return { rows: out, total: data.total }
  }, [data])

  const columns = useMemo<ColumnDef<EmpRow>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Name',
        enableSorting: true,
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.name}</div>
            {row.original.employeeCode && (
              <div className="text-muted-foreground font-mono text-xs">{row.original.employeeCode}</div>
            )}
          </div>
        ),
      },
      {
        id: 'jobRoles',
        header: 'Role',
        cell: ({ row }) =>
          row.original.jobRoles.length > 0
            ? row.original.jobRoles.map((jr) => jr.jobRole.name).join(', ')
            : '—',
        enableSorting: false,
      },
      {
        id: 'type',
        header: 'Type',
        cell: ({ row }) => <Badge variant="outline">{row.original.employeeType.name}</Badge>,
        enableSorting: false,
      },
      {
        id: 'joinedAt',
        accessorKey: 'joinedAt',
        header: 'Joined',
        cell: ({ getValue }) => format(new Date(getValue() as string), 'dd MMM yyyy'),
        enableSorting: true,
      },
      {
        id: 'currentSalary',
        accessorKey: 'currentSalary',
        header: 'Salary',
        cell: ({ getValue }) => (
          <span className="text-right tabular-nums">{formatPkr(getValue() as number)}</span>
        ),
        enableSorting: true,
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <Badge
            variant={row.original.status === 'ACTIVE' ? 'default' : 'secondary'}
            className="text-xs"
          >
            {row.original.status}
          </Badge>
        ),
        enableSorting: false,
      },
      {
        id: 'actions',
        header: () => <span className="text-right block w-full">Actions</span>,
        cell: ({ row }) => (
          <div className="text-right">
            <Button variant="ghost" size="sm" render={<Link href={`/employees/${row.original.id}`} />}>
              View
            </Button>
          </div>
        ),
        enableSorting: false,
      },
    ],
    []
  )

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack useReactTable
  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, pagination },
    onSortingChange: (up) => {
      setSorting((prev) => (typeof up === 'function' ? (up as (o: SortingState) => SortingState)(prev) : up))
      setPagination((p) => ({ ...p, pageIndex: 0 }))
    },
    onPaginationChange: setPagination,
    manualPagination: true,
    manualSorting: true,
    pageCount: total === 0 ? 0 : Math.ceil(total / pagination.pageSize),
    getCoreRowModel: getCoreRowModel(),
  })

  const loading = isPending || (isFetching && rows.length === 0)

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
        <div className="shrink-0">
          <Input
            type="search"
            placeholder="Search name, type, or role…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-sm"
            aria-label="Filter employees"
          />
        </div>
        <div className="min-h-0 flex-1 overflow-auto rounded-md border border-border/80 bg-card">
          <DataTableSkeleton
            columns={7}
            rows={10}
            actionColumn
            stickyHeader
            headerLabels={['Name', 'Role', 'Type', 'Joined', 'Salary', 'Status', 'Actions']}
            numericColumnIndices={[4]}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <div className="shrink-0">
        <Input
          type="search"
          placeholder="Search name, type, or role…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-sm"
          aria-label="Filter employees"
        />
      </div>
      <div
        className={cn('min-h-0 flex-1 overflow-auto rounded-md border border-border/80 bg-card', isPlaceholderData && 'opacity-60')}
      >
        <Table>
          <TableHeader className={TABLE_HEADER_STICKY}>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id} className={h.column.id === 'currentSalary' ? 'text-right' : ''}>
                    {h.isPlaceholder
                      ? null
                      : h.column.getCanSort() ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="-ml-2 h-8 px-2"
                          onClick={h.column.getToggleSortingHandler()}
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {h.column.getIsSorted() === 'asc'
                            ? ' ↑'
                            : h.column.getIsSorted() === 'desc'
                              ? ' ↓'
                              : ''}
                        </Button>
                      ) : (
                        flexRender(h.column.columnDef.header, h.getContext())
                      )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isError ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-destructive">
                  {error instanceof Error ? error.message : 'Failed to load.'}{' '}
                  <Button type="button" variant="link" className="h-auto p-0" onClick={() => refetch()}>
                    Retry
                  </Button>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  <UserX className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  No employees found
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={
                        cell.column.id === 'currentSalary'
                          ? 'text-right'
                          : cell.column.id === 'actions'
                            ? 'text-right'
                            : ''
                      }
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} total={total} />
    </div>
  )
}
