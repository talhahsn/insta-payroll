'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, startOfMonth } from 'date-fns'
import { CalendarIcon, Plus, Trash2, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { formatPkr } from '@/lib/format-money'

interface SalaryHold {
  id: string
  days: number
  ratePerDay: number
  amount: number
  reason: string | null
  heldForMonth: string | Date
  releasedAt: string | Date | null
  releasedInPayrollId: string | null
}

interface Props {
  employeeId: string
  canManage: boolean
  holds: SalaryHold[]
}

const fmt = formatPkr

function AddHoldDialog({ employeeId }: { employeeId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [calOpen, setCalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [days, setDays] = useState('')
  const [rate, setRate] = useState('')
  const [reason, setReason] = useState('')
  const [month, setMonth] = useState<Date | undefined>(startOfMonth(new Date()))

  async function handleSubmit() {
    if (!days || !rate || !month) {
      toast.error('Fill in all required fields')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/salary-holds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          days: parseFloat(days),
          ratePerDay: parseFloat(rate),
          reason: reason || undefined,
          heldForMonth: format(month, 'yyyy-MM-dd'),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? 'Failed to record hold')
        return
      }
      toast.success('Salary hold recorded')
      setOpen(false)
      setDays(''); setRate(''); setReason('')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button size="sm" variant="outline" />}
      >
        <Plus className="h-4 w-4 mr-1" />
        Add Hold
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Record Salary Hold</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Days *</Label>
              <Input type="number" value={days} onChange={(e) => setDays(e.target.value)} placeholder="e.g. 7" min={0.5} step={0.5} />
            </div>
            <div className="space-y-1">
              <Label>Rate/day *</Label>
              <Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="e.g. 1100" min={1} />
            </div>
          </div>
          {days && rate && (
            <p className="text-sm text-muted-foreground">
              Amount: {fmt(parseFloat(days || '0') * parseFloat(rate || '0'))}
            </p>
          )}
          <div className="space-y-1">
            <Label>Month *</Label>
            <Popover open={calOpen} onOpenChange={setCalOpen}>
              <PopoverTrigger
                render={<Button variant="outline" className={cn('w-full justify-start text-left font-normal', !month && 'text-muted-foreground')} />}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {month ? format(month, 'MMM yyyy') : 'Pick month'}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={month}
                  onSelect={(d) => { if (d) { setMonth(startOfMonth(d)); setCalOpen(false) } }}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1">
            <Label>Reason</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Security hold, carry-forward…" />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Saving…' : 'Save Hold'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ReleaseDialog({ hold }: { hold: SalaryHold }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [calOpen, setCalOpen] = useState(false)
  const [month, setMonth] = useState<Date | undefined>(startOfMonth(new Date()))
  const [loading, setLoading] = useState(false)

  async function handleRelease() {
    if (!month) return
    setLoading(true)
    try {
      const res = await fetch(`/api/salary-holds/${hold.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'release', month: format(month, 'yyyy-MM-dd') }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? 'Failed to release hold')
        return
      }
      toast.success('Hold released — will appear in that month\'s payroll')
      setOpen(false)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button size="sm" variant="outline" className="h-7 text-xs" />}
      >
        <CheckCircle className="h-3 w-3 mr-1" />
        Release
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Release {fmt(hold.amount)}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <p className="text-sm text-muted-foreground">
            Select which month’s payroll this withheld amount should be included in.
          </p>
          <div className="space-y-1">
            <Label>Release in month *</Label>
            <Popover open={calOpen} onOpenChange={setCalOpen}>
              <PopoverTrigger
                render={<Button variant="outline" className="w-full justify-start text-left font-normal" />}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {month ? format(month, 'MMM yyyy') : 'Pick month'}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={month}
                  onSelect={(d) => { if (d) { setMonth(startOfMonth(d)); setCalOpen(false) } }}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleRelease} disabled={loading || !month}>
              {loading ? 'Releasing…' : 'Confirm Release'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function SalaryHoldsCard({ employeeId, canManage, holds }: Props) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function deleteHold(id: string, amount: number) {
    if (!confirm(`Delete hold of ${fmt(amount)}? This cannot be undone.`)) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/salary-holds/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? 'Failed to delete hold')
        return
      }
      toast.success('Hold deleted')
      router.refresh()
    } finally {
      setDeletingId(null)
    }
  }

  const unreleased = holds.filter((h) => !h.releasedAt)
  const totalUnreleased = unreleased.reduce((s, h) => s + h.amount, 0)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base">Salary Holds</CardTitle>
          {totalUnreleased > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {fmt(totalUnreleased)} pending release
            </p>
          )}
        </div>
        {canManage && <AddHoldDialog employeeId={employeeId} />}
      </CardHeader>
      <CardContent className="p-0">
        {holds.length === 0 ? (
          <p className="text-sm text-muted-foreground px-6 pb-4">No salary holds recorded.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {holds.map((hold) => (
                <TableRow key={hold.id}>
                  <TableCell className="text-sm">
                    {format(new Date(hold.heldForMonth), 'MMM yyyy')}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {hold.reason ?? `${hold.days} days × PKR ${hold.ratePerDay.toLocaleString()}`}
                  </TableCell>
                  <TableCell className="text-right font-medium">{fmt(hold.amount)}</TableCell>
                  <TableCell>
                    {hold.releasedAt ? (
                      <Badge variant="default" className="bg-green-600 text-xs">
                        Released {format(new Date(hold.releasedAt), 'MMM yyyy')}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Pending</Badge>
                    )}
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      {!hold.releasedAt && (
                        <div className="flex gap-1 justify-end">
                          <ReleaseDialog hold={hold} />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-destructive"
                            onClick={() => deleteHold(hold.id, hold.amount)}
                            disabled={deletingId === hold.id}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
