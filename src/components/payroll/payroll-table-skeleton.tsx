import { DataTableSkeleton } from '@/components/ui/data-table-skeleton'

const PAYROLL_HEADER_LABELS = [
  'Employee',
  'Base',
  'Leave Ded.',
  'Coverage',
  'Advances',
  'Withheld',
  'Festivals',
  'Hold Rel.',
  'Net Payable',
  'Paid',
  'Remaining',
  'Status',
  '',
] as const

/**
 * Shown while payroll month / view is navigating (RSC is loading).
 */
export function PayrollTableSkeleton() {
  return (
    <DataTableSkeleton
      columns={13}
      rows={10}
      actionColumn
      compact
      stickyHeader
      numericColumnIndices={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
      headerLabels={[...PAYROLL_HEADER_LABELS]}
    />
  )
}
