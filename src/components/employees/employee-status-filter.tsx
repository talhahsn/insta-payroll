'use client'

import { useRouter, useSearchParams } from 'next/navigation'
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
]

export function EmployeeStatusFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const current = searchParams.get('status') ?? 'active'

  function onChange(value: string | null) {
    if (!value) return
    const params = new URLSearchParams(searchParams.toString())
    params.set('status', value)
    router.push(`/employees?${params.toString()}`)
  }

  return (
    <Select
      value={current}
      onValueChange={onChange}
      items={OPTIONS}
    >
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
  )
}
