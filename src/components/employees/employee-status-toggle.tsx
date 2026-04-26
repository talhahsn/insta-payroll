'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { UserCheck, UserX } from 'lucide-react'

interface Props {
  employeeId: string
  currentStatus: string
  employeeName: string
}

export function EmployeeStatusToggle({ employeeId, currentStatus, employeeName }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const isActive = currentStatus === 'ACTIVE'

  async function toggle() {
    const action = isActive ? 'deactivate' : 'activate'
    if (!confirm(`${isActive ? 'Deactivate' : 'Reactivate'} "${employeeName}"?`)) return

    setLoading(true)
    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle-status' }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? `Failed to ${action} employee`)
        return
      }
      toast.success(`${employeeName} ${isActive ? 'deactivated' : 'reactivated'}`)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggle}
      disabled={loading}
      className={isActive ? 'text-destructive border-destructive/30 hover:bg-destructive/10' : ''}
    >
      {isActive ? (
        <>
          <UserX className="h-4 w-4 mr-2" />
          {loading ? 'Deactivating…' : 'Deactivate'}
        </>
      ) : (
        <>
          <UserCheck className="h-4 w-4 mr-2" />
          {loading ? 'Reactivating…' : 'Reactivate'}
        </>
      )}
    </Button>
  )
}
