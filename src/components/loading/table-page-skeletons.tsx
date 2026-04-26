import {
  DataTableSkeleton,
  ListPageHeaderSkeleton,
  MonthNavRowSkeleton,
  SettingsPageHeaderSkeleton,
} from '@/components/ui/data-table-skeleton'
import { PayrollTableSkeleton } from '@/components/payroll/payroll-table-skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function EmployeesListPageSkeleton() {
  return (
    <div className="space-y-6">
      <ListPageHeaderSkeleton />
      <DataTableSkeleton
        border
        columns={7}
        actionColumn
        numericColumnIndices={[4]}
        className="w-full"
      />
    </div>
  )
}

export function PayrollListPageSkeleton() {
  return (
    <div className="flex h-0 min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <div className="flex shrink-0 items-center justify-between">
        <div className="space-y-0.5">
          <Skeleton className="h-7 w-28 sm:h-8 sm:w-32" />
          <Skeleton className="h-3 w-20 sm:h-4 sm:w-24" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="flex h-0 min-h-0 flex-1 flex-col gap-2 overflow-hidden">
        <div className="flex shrink-0 items-center justify-between">
          <MonthNavRowSkeleton />
          <Skeleton className="h-9 w-[7.5rem] shrink-0 rounded-lg" />
        </div>
        <div className="flex h-0 min-h-0 flex-1 flex-col gap-1.5">
          <div className="min-h-0 flex-1 overflow-auto overscroll-contain rounded-md border border-border/80 bg-card">
            <PayrollTableSkeleton />
          </div>
        </div>
      </div>
    </div>
  )
}

export function AdvancesListPageSkeleton() {
  return (
    <div className="space-y-6">
      <ListPageHeaderSkeleton />
      <MonthNavRowSkeleton withSummary />
      <DataTableSkeleton
        border
        columns={7}
        actionColumn
        numericColumnIndices={[3]}
        className="w-full"
      />
    </div>
  )
}

export function CoverageListPageSkeleton() {
  return (
    <div className="space-y-6">
      <ListPageHeaderSkeleton />
      <MonthNavRowSkeleton />
      <DataTableSkeleton
        border
        columns={10}
        actionColumn
        numericColumnIndices={[6, 7]}
        className="w-full"
      />
    </div>
  )
}

export function LeavesListPageSkeleton() {
  return (
    <div className="space-y-6">
      <ListPageHeaderSkeleton />
      <MonthNavRowSkeleton />
      <DataTableSkeleton border columns={8} actionColumn className="w-full" />
    </div>
  )
}

export function FestivalsListPageSkeleton() {
  return (
    <div className="space-y-6">
      <ListPageHeaderSkeleton />
      <DataTableSkeleton
        border
        columns={7}
        actionColumn
        numericColumnIndices={[4]}
        className="w-full"
      />
    </div>
  )
}

export function SettingsUsersPageSkeleton() {
  return (
    <div className="max-w-2xl space-y-6">
      <SettingsPageHeaderSkeleton />
      <DataTableSkeleton border columns={4} className="w-full" />
    </div>
  )
}

export function SettingsEmployeeTypesPageSkeleton() {
  return (
    <div className="max-w-2xl space-y-6">
      <SettingsPageHeaderSkeleton />
      <DataTableSkeleton border columns={3} actionColumn className="w-full" />
    </div>
  )
}

export function SettingsSimpleTablePageSkeleton() {
  return (
    <div className="max-w-2xl space-y-6">
      <SettingsPageHeaderSkeleton />
      <DataTableSkeleton border columns={2} actionColumn className="w-full" />
    </div>
  )
}

export function EmployeeDetailPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-16" />
          <div className="space-y-1">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
        <Skeleton className="h-9 w-20" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2 rounded-lg border p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
          </div>
        ))}
      </div>
      <div className="space-y-3 rounded-lg border p-4">
        <Skeleton className="h-5 w-32" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Salary History</CardTitle>
            <CardDescription>All salary changes</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTableSkeleton columns={2} numericColumnIndices={[1]} rows={4} className="w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

export function PayrollDetailPageSkeleton() {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9" />
          <div className="space-y-1">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-9 w-40" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <DataTableSkeleton border columns={2} numericColumnIndices={[1]} rows={12} className="w-full" />
        </CardContent>
      </Card>
    </div>
  )
}
