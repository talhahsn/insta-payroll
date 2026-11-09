'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { CalendarIcon, PlusCircle } from 'lucide-react'
import { toast } from 'sonner'
import { invalidatePayrollRosterQueries } from '@/lib/invalidate-payroll-roster-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { formatPkr } from '@/lib/format-money'

interface Props {
  employeeId: string
  monthStr: string
  remaining: number
}

export function RecordPaymentDialog({ employeeId, monthStr, remaining }: Props) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState(String(Math.round(remaining)))
  const [paidAt, setPaidAt] = useState<Date | undefined>(new Date())
  const [notes, setNotes] = useState('')
  const [calOpen, setCalOpen] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!paidAt) return
    setLoading(true)
    try {
      const res = await fetch(`/api/payroll/${employeeId}/disbursements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: monthStr,
          amount: parseFloat(amount),
          paidAt: paidAt.toISOString(),
          notes: notes || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? 'Failed to record payment')
        return
      }
      toast.success('Payment recorded')
      setOpen(false)
      await invalidatePayrollRosterQueries(queryClient)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <PlusCircle className="h-4 w-4 mr-2" />
        Record Payment
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (PKR) *</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={1}
              step="1"
              required
            />
            <p className="text-xs text-muted-foreground">
              Remaining: {formatPkr(remaining)}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Date Paid *</Label>
            <Popover open={calOpen} onOpenChange={setCalOpen}>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !paidAt && 'text-muted-foreground'
                    )}
                  />
                }
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {paidAt ? format(paidAt, 'dd MMM yyyy') : 'Pick date'}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={paidAt}
                  onSelect={(d) => { setPaidAt(d); setCalOpen(false) }}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
