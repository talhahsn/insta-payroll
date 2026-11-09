'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { z } from 'zod'
import { toast } from 'sonner'
import { postJson } from '@/lib/api-client'
import { invalidatePayrollRosterQueries } from '@/lib/invalidate-payroll-roster-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface Employee {
  id: string
  name: string
}

interface Props {
  employees: Employee[]
}

const advanceFormSchema = z.object({
  employeeId: z.string().min(1, 'Select an employee'),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  type: z.enum(['CASH', 'FOOD']),
  date: z.date({ error: 'Pick a date' }),
  notes: z.string().optional(),
})

export function AdvanceForm({ employees }: Props) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [employeeId, setEmployeeId] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'CASH' | 'FOOD'>('CASH')
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [notes, setNotes] = useState('')
  const [calOpen, setCalOpen] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = advanceFormSchema.safeParse({
      employeeId,
      amount,
      type,
      date,
      notes: notes || undefined,
    })
    if (!parsed.success) {
      const first = parsed.error.issues[0]
      toast.error(first?.message ?? 'Invalid form')
      return
    }
    setLoading(true)
    try {
      await postJson('/api/advances', {
        employeeId: parsed.data.employeeId,
        amount: parsed.data.amount,
        type: parsed.data.type,
        date: format(parsed.data.date, 'yyyy-MM-dd'),
        notes: parsed.data.notes,
      })
      toast.success('Advance recorded')
      await queryClient.invalidateQueries({ queryKey: ['advances'] })
      await invalidatePayrollRosterQueries(queryClient)
      router.push('/advances')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record advance')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Employee *</Label>
              <Select value={employeeId} onValueChange={(v) => setEmployeeId(v ?? '')} required items={employees.map((e) => ({ value: e.id, label: e.name }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (PKR) *</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 2000"
                min={1}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Type *</Label>
              <Select value={type} onValueChange={(v) => setType((v ?? 'CASH') as 'CASH' | 'FOOD')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash Advance</SelectItem>
                  <SelectItem value="FOOD">Food Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date *</Label>
              <Popover open={calOpen} onOpenChange={setCalOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !date && 'text-muted-foreground'
                      )}
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Record Advance'}
        </Button>
      </div>
    </form>
  )
}
