'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { CalendarIcon, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
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

interface Props {
  employeeId: string
  employeeName: string
  leftAt: Date | null
}

export function MarkLeftDialog({ employeeId, employeeName, leftAt: initialLeftAt }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [calOpen, setCalOpen] = useState(false)
  const [date, setDate] = useState<Date | undefined>(initialLeftAt ?? new Date())
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!date) {
      toast.error('Select a left date')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark-left', leftAt: format(date, 'yyyy-MM-dd') }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? 'Failed to mark employee as left')
        return
      }
      toast.success(`${employeeName} marked as left on ${format(date, 'dd MMM yyyy')}`)
      setOpen(false)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10" />
        }
      >
        <LogOut className="h-4 w-4 mr-2" />
        Mark as Left
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Mark {employeeName} as Left</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <p className="text-sm text-muted-foreground">
            This sets their last working day. Payroll will be prorated up to this date. They will be marked inactive.
          </p>
          <div className="space-y-2">
            <label className="text-sm font-medium">Last Working Day</label>
            <Popover open={calOpen} onOpenChange={setCalOpen}>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground')}
                  />
                }
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, 'dd MMM yyyy') : 'Pick date'}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => {
                    setDate(d)
                    setCalOpen(false)
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading || !date} variant="destructive">
              {loading ? 'Saving…' : 'Confirm'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
