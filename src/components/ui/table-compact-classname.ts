/** Tighter cell/header padding for dense data grids (more rows per viewport). */
export const tableCompactClassname =
  'min-w-0 [&_[data-slot=table-head]]:h-8 [&_[data-slot=table-head]]:px-1.5 [&_[data-slot=table-head]]:py-0.5 [&_[data-slot=table-head]]:text-xs [&_[data-slot=table-cell]]:px-1.5 [&_[data-slot=table-cell]]:py-1'

/** @deprecated Use `tableCompactClassname` */
export const payrollTableCompactClassname = tableCompactClassname
