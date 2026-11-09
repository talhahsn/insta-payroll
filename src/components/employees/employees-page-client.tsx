'use client'

import Link from 'next/link'
import { useCallback, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ListPageScrollRoot } from '@/components/layout/list-page-layout'
import { EmployeesDataTable } from '@/components/employees/employees-data-table'
import { useCan } from '@/components/providers/permissions-provider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'all', label: 'All Employees' },
] as const

type StatusFilter = 'active' | 'inactive' | 'all'

function syncStatusUrl(status: StatusFilter) {
  const params = new URLSearchParams()
  if (status !== 'active') params.set('status', status)
  const qs = params.toString()
  const href = qs ? `/employees?${qs}` : '/employees'
  if (typeof window !== 'undefined') {
    window.history.replaceState(window.history.state, '', href)
  }
}

export function EmployeesPageClient({ initialStatus }: { initialStatus?: string }) {
  const canManage = useCan('employees', 'manage')
  const [status, setStatus] = useState<StatusFilter>(
    initialStatus === 'inactive' ? 'inactive' : initialStatus === 'all' ? 'all' : 'active'
  )

  const onStatusChange = useCallback((value: string | null) => {
    if (!value) return
    const next = (value === 'inactive' || value === 'all' ? value : 'active') as StatusFilter
    setStatus(next)
    syncStatusUrl(next)
  }, [])

  return (
    <ListPageScrollRoot>
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-muted-foreground">Search, sort, and page the list below</p>
        </div>
        <div className="flex gap-2">
          <Select value={status} onValueChange={onStatusChange} items={[...OPTIONS]}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canManage && (
            <Button render={<Link href="/employees/new" />}>
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          )}
        </div>
      </div>

      <EmployeesDataTable status={status} canManage={canManage} />
    </ListPageScrollRoot>
  )
}
