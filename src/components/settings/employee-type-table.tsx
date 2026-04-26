'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { EmployeeType } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TABLE_HEADER_STICKY } from '@/components/ui/table-header-classname'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollableTableRegion } from '@/components/layout/list-page-layout'

interface Props {
  types: EmployeeType[]
}

const FLAGS = [
  { key: 'isDailyRate', label: 'Daily rate' },
  { key: 'isLeaveEligible', label: 'Leave eligible' },
  { key: 'isDepositEligible', label: 'Deposit eligible' },
  { key: 'isHiddenFromManager', label: 'Hidden from manager' },
  { key: 'hasBillingCycle', label: 'Billing cycle' },
] as const

type FlagKey = typeof FLAGS[number]['key']

const DEFAULT_FLAGS: Record<FlagKey, boolean> = {
  isDailyRate: true,
  isLeaveEligible: true,
  isDepositEligible: true,
  isHiddenFromManager: false,
  hasBillingCycle: false,
}

export function EmployeeTypeTable({ types }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [flags, setFlags] = useState<Record<FlagKey, boolean>>(DEFAULT_FLAGS)

  function toggleFlag(key: FlagKey) {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    try {
      const res = await fetch('/api/settings/employee-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, ...flags }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? 'Failed to add employee type')
        return
      }
      toast.success('Employee type added')
      setName('')
      setFlags(DEFAULT_FLAGS)
      setOpen(false)
      router.refresh()
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this employee type?')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/settings/employee-types/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? 'Failed to delete employee type')
        return
      }
      toast.success('Employee type deleted')
      router.refresh()
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="shrink-0">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="h-4 w-4 mr-2" />
            Add Employee Type
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Employee Type</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="typeName">Name *</Label>
                <Input
                  id="typeName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Supervisor"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Flags</Label>
                <div className="space-y-2">
                  {FLAGS.map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={flags[key]}
                        onChange={() => toggleFlag(key)}
                        className="rounded"
                      />
                      <span className="text-sm">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={adding}>{adding ? 'Adding...' : 'Add'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {types.length === 0 ? (
        <p className="shrink-0 text-sm text-muted-foreground">No employee types yet.</p>
      ) : (
        <ScrollableTableRegion>
          <Table>
            <TableHeader className={TABLE_HEADER_STICKY}>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Flags</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {t.isDailyRate && <Badge variant="outline" className="text-xs">Daily rate</Badge>}
                      {t.isLeaveEligible && <Badge variant="outline" className="text-xs">Leave</Badge>}
                      {t.isDepositEligible && <Badge variant="outline" className="text-xs">Deposit</Badge>}
                      {t.isHiddenFromManager && <Badge variant="secondary" className="text-xs">Hidden</Badge>}
                      {t.hasBillingCycle && <Badge variant="secondary" className="text-xs">Billing</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(t.id)}
                      disabled={deletingId === t.id}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollableTableRegion>
      )}
    </div>
  )
}
