'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { tableCompactClassname } from '@/components/ui/table-compact-classname'
import { TABLE_HEADER_STICKY } from '@/components/ui/table-header-classname'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { getErrorMessageFromResponse } from '@/lib/api-client'
import { formatPkr } from '@/lib/format-money'
import { buildPayrollRosterSearchParams, type PayrollRosterSort } from '@/lib/payroll-roster-query'
import { cn } from '@/lib/utils'
import type { PayrollCalculation } from '@/types/payroll.types'
import { PayrollTableSkeleton } from '@/components/payroll/payroll-table-skeleton'

const fmt = formatPkr

function statusBadge(remaining: number, netPayable: number) {
  if (netPayable <= 0) return <Badge variant="outline" className="text-muted-foreground">In Debt</Badge>
  if (remaining <= 0) return <Badge className="bg-green-600">Paid</Badge>
  return <Badge variant="secondary">Pending</Badge>
}

function sortToApi(s: SortingState[0] | undefined): { sort: PayrollRosterSort; order: 'asc' | 'desc' } {
  if (!s) return { sort: 'name', order: 'asc' }
  if (s.id === 'baseEarned') return { sort: 'base', order: s.desc ? 'desc' : 'asc' }
  if (s.id === 'netPayable') return { sort: 'net', order: s.desc ? 'desc' : 'asc' }
  return { sort: 'name', order: s.desc ? 'desc' : 'asc' }
}

export function PayrollRosterDataTable({
  month,
  monthParam,
  viewType,
}: {
  month: Date
  monthParam: string
  viewType: 'LIVE' | 'EXPECTED'
}) {
  const [q, setQ] = useState('')
  const qDebounced = useDebouncedValue(q, 300)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'employeeName', desc: false }])
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: DEFAULT_TABLE_PAGE_SIZE })

  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }, [qDebounced])

  const { sort, order } = sortToApi(sorting[0])

  const { data: rosterData, isFetching, isError, error, isPlaceholderData, refetch, isPending } = useQuery({
    queryKey: [
      'payrollRoster',
      monthParam || format(month, 'yyyy-MM'),
      viewType,
      qDebounced,
      pagination.pageIndex,
      pagination.pageSize,
      sort,
      order,
    ] as const,
    queryFn: async () => {
      const { pageIndex, pageSize } = pagination
      const params = buildPayrollRosterSearchParams({
        month,
        monthParam,
        viewType,
        page: pageIndex + 1,
        pageSize,
        sort,
        order,
        q: qDebounced,
      })
      const res = await fetch(`/api/payroll/roster?${params.toString()}`, { credentials: 'include' })
      if (!res.ok) {
        const msg = await getErrorMessageFromResponse(res)
        throw new Error(msg || 'Failed to load payroll')
      }
      return res.json() as Promise<{
        rows: PayrollCalculation[]
        total: number
        totals: { totalNet: number; totalPaid: number; totalRemaining: number }
      }>
    },
    placeholderData: keepPreviousData,
  })

  const data = rosterData?.rows ?? []
  const total = rosterData?.total ?? 0
  const totals = rosterData?.totals ?? { totalNet: 0, totalPaid: 0, totalRemaining: 0 }
  const loading = isPending || (isFetching && data.length === 0)

  const rowHref = useCallback(
    (employeeId: string) => {
      const params = new URLSearchParams()
      if (monthParam) params.set('month', monthParam)
      params.set('view', viewType)
      return `/payroll/${employeeId}?${params.toString()}`
    },
    [monthParam, viewType]
  )

  const columns = useMemo<ColumnDef<PayrollCalculation>[]>(
    () => [
      { id: 'employeeName', accessorKey: 'employeeName', header: 'Employee', enableSorting: true },
      { id: 'baseEarned', accessorKey: 'baseEarned', header: 'Base', enableSorting: true,
        cell: ({ getValue }) => <span className="text-right tabular-nums block">{fmt(getValue() as number)}</span> },
      { id: 'leaveDeduction', header: 'Leave Ded.', cell: ({ row }) => (
        <span className="text-right text-destructive tabular-nums block">
          {row.original.leaveDeduction > 0 ? `−${fmt(row.original.leaveDeduction)}` : '—'}
        </span>
      ), enableSorting: false },
      { id: 'coverage', header: 'Coverage', cell: ({ row }) => (
        <span className="text-right text-green-600 tabular-nums block">
          {row.original.coverageBonus > 0 ? `+${fmt(row.original.coverageBonus)}` : '—'}
        </span>
      ), enableSorting: false },
      { id: 'adv', header: 'Advances', cell: ({ row }) => {
        const v = row.original.advancesTotal + row.original.foodExpensesTotal
        return <span className="text-right text-destructive tabular-nums block">{v > 0 ? `−${fmt(v)}` : '—'}</span>
      }, enableSorting: false },
      { id: 'hold', header: 'Withheld', cell: ({ row }) => (
        <span className="text-right text-destructive tabular-nums block">
          {row.original.salaryHoldDeduction > 0 ? `−${fmt(row.original.salaryHoldDeduction)}` : '—'}
        </span>
      ), enableSorting: false },
      { id: 'fest', header: 'Festivals', cell: ({ row }) => (
        <span className="text-right text-green-600 tabular-nums block">
          {row.original.festivalBonus > 0 ? `+${fmt(row.original.festivalBonus)}` : '—'}
        </span>
      ), enableSorting: false },
      { id: 'holdRel', header: 'Hold Rel.', cell: ({ row }) => (
        <span className="text-right text-green-600 tabular-nums block">
          {row.original.salaryHoldRelease > 0 ? `+${fmt(row.original.salaryHoldRelease)}` : '—'}
        </span>
      ), enableSorting: false },
      { id: 'netPayable', accessorKey: 'netPayable', header: 'Net Payable', enableSorting: true,
        cell: ({ getValue }) => (
          <span className="text-right text-sm font-bold tabular-nums block sm:text-base">{fmt(getValue() as number)}</span>
        ) },
      { id: 'amountPaid', accessorKey: 'amountPaid', header: 'Paid', cell: ({ getValue }) => (
        <span className="text-right text-muted-foreground tabular-nums block">{fmt(getValue() as number)}</span>
      ), enableSorting: false },
      { id: 'remaining', header: 'Remaining', cell: ({ row }) => (
        <span className="text-right font-medium tabular-nums block">
          {row.original.remainingToPay > 0 ? fmt(row.original.remainingToPay) : '—'}
        </span>
      ), enableSorting: false },
      { id: 'st', header: 'Status', cell: ({ row }) => statusBadge(row.original.remainingToPay, row.original.netPayable), enableSorting: false },
      { id: 'go', header: '', cell: ({ row }) => (
        <Button variant="ghost" size="sm" className="h-7 text-xs" render={<Link href={rowHref(row.original.employeeId)} />}>
          Detail
        </Button>
      ), enableSorting: false },
    ],
    [rowHref]
  )

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack useReactTable
  const table = useReactTable({
    data,
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

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
        <div className="shrink-0">
          <Input
            type="search"
            placeholder="Search by employee name…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-sm"
            aria-label="Filter payroll roster"
          />
        </div>
        <div className={cn(tableCompactClassname, 'min-h-0 flex-1 overflow-auto rounded-md border bg-card')}>
          <PayrollTableSkeleton />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <div className="shrink-0">
        <Input
          type="search"
          placeholder="Search by employee name…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-sm"
          aria-label="Filter payroll roster"
        />
      </div>
      <div
        className={cn(
          tableCompactClassname,
          'min-h-0 flex-1 overflow-auto rounded-md border bg-card',
          isPlaceholderData && 'opacity-60'
        )}
      >
        <Table>
          <TableHeader className={TABLE_HEADER_STICKY}>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead
                    key={h.id}
                    className={h.column.id === 'baseEarned' || h.column.id === 'netPayable' || ['leaveDeduction','coverage','adv','hold','fest','holdRel','amountPaid','remaining'].includes(h.column.id) ? 'text-right' : ''}
                  >
                    {h.isPlaceholder ? null : h.column.getCanSort() ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="-ml-2 h-8 px-2"
                        onClick={h.column.getToggleSortingHandler()}
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {h.column.getIsSorted() === 'asc' ? ' ↑' : h.column.getIsSorted() === 'desc' ? ' ↓' : ''}
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
                <TableCell colSpan={13} className="text-center text-sm text-destructive">
                  {error instanceof Error ? error.message : 'Failed to load.'}{' '}
                  <Button type="button" variant="link" className="h-auto p-0" onClick={() => refetch()}>
                    Retry
                  </Button>
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} className="text-muted-foreground py-10 text-center text-sm">
                  No employees found.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={cell.column.id !== 'employeeName' && cell.column.id !== 'st' && cell.column.id !== 'go' ? 'text-right' : ''}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination
        table={table}
        total={total}
        startSlot={
          !loading && total > 0 ? (
            <div className="flex max-w-full flex-wrap items-baseline gap-x-3 gap-y-1 sm:gap-x-5">
              <span className="whitespace-nowrap text-sm sm:text-base">
                <span className="text-muted-foreground">Net </span>
                <span className="text-foreground text-base font-bold tabular-nums sm:text-lg">
                  {fmt(totals.totalNet)}
                </span>
              </span>
              <span className="whitespace-nowrap text-sm sm:text-base">
                <span className="text-muted-foreground">Paid </span>
                <span className="text-base font-bold text-green-600 tabular-nums sm:text-lg">
                  {fmt(totals.totalPaid)}
                </span>
              </span>
              <span className="whitespace-nowrap text-sm sm:text-base">
                <span className="text-muted-foreground">Rem. </span>
                <span className="text-base font-bold text-orange-500 tabular-nums sm:text-lg">
                  {fmt(totals.totalRemaining)}
                </span>
              </span>
            </div>
          ) : null
        }
      />
    </div>
  )
}
