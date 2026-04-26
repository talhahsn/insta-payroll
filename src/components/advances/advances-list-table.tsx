'use client'

import { useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
} from '@tanstack/react-table'
import { format, parseISO } from 'date-fns'
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
import { formatPkr } from '@/lib/format-money'
import { DeleteAdvanceButton } from '@/components/advances/delete-advance-button'

export type AdvanceRow = {
  id: string
  date: string
  amount: number
  type: 'CASH' | 'FOOD'
  notes: string | null
  employee: { name: string }
  createdBy: { name: string }
}

export function AdvancesListTable({ rows: initialRows }: { rows: AdvanceRow[] }) {
  const [globalFilter, setGlobalFilter] = useState('')
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_TABLE_PAGE_SIZE,
  })

  const columns = useMemo<ColumnDef<AdvanceRow>[]>(
    () => [
      {
        accessorKey: 'employee',
        header: 'Employee',
        enableSorting: true,
        accessorFn: (r) => r.employee.name,
        cell: ({ row }) => <span className="font-medium">{row.original.employee.name}</span>,
      },
      {
        id: 'date',
        header: 'Date',
        enableSorting: true,
        accessorFn: (r) => r.date,
        cell: ({ row }) => format(parseISO(row.original.date), 'dd MMM'),
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ row }) => (
          <Badge variant={row.original.type === 'FOOD' ? 'secondary' : 'outline'}>
            {row.original.type === 'FOOD' ? 'Food' : 'Cash'}
          </Badge>
        ),
      },
      {
        accessorKey: 'amount',
        header: 'Amount (PKR)',
        cell: ({ getValue }) => (
          <span className="text-right tabular-nums">{formatPkr(getValue() as number)}</span>
        ),
      },
      {
        accessorKey: 'notes',
        header: 'Notes',
        cell: ({ getValue }) => (
          <span className="text-muted-foreground text-sm">{(getValue() as string | null) ?? '—'}</span>
        ),
      },
      {
        id: 'by',
        header: 'Recorded by',
        accessorFn: (r) => r.createdBy.name,
        cell: ({ getValue }) => <span className="text-muted-foreground text-sm">{getValue() as string}</span>,
      },
      { id: 'act', header: '', cell: ({ row }) => <DeleteAdvanceButton id={row.original.id} />, enableSorting: false },
    ],
    []
  )

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack useReactTable
  const table = useReactTable({
    data: initialRows,
    columns,
    state: { globalFilter: globalFilter || undefined, pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const f = String(filterValue).toLowerCase()
      if (!f) return true
      const r = row.original
      return [
        r.employee.name,
        r.createdBy.name,
        r.notes,
        r.type,
        r.amount.toString(),
        format(parseISO(r.date), 'dd MMM yyyy'),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(f)
    },
  })

  if (initialRows.length === 0) {
    return <p className="shrink-0 text-muted-foreground text-sm">No advances recorded for this month.</p>
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden">
      <div className="shrink-0">
        <Input
          type="search"
          placeholder="Search this month…"
          value={globalFilter}
          onChange={(e) => {
            const v = e.target.value
            setGlobalFilter(v)
            setPagination((p) => ({ ...p, pageIndex: 0 }))
          }}
          className="max-w-sm"
        />
      </div>
      <div className="min-h-0 min-w-0 flex-1 overflow-auto overscroll-y-contain rounded-md border border-border/80 bg-card">
        <Table>
          <TableHeader className={TABLE_HEADER_STICKY}>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id} className={h.column.id === 'amount' ? 'text-right' : ''}>
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
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8 text-sm">
                  No rows match your search.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cell.column.id === 'amount' ? 'text-right' : ''}
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
      <DataTablePagination
        table={table}
        total={table.getFilteredRowModel().rows.length}
      />
    </div>
  )
}
