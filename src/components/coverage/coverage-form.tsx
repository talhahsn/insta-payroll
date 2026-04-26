'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  currentSalary: number
}

interface Counter {
  id: string
  name: string
}

interface Props {
  absentEmployees: Employee[]
  coveringEmployees: Employee[]
  counters: Counter[]
}

const DAILY_RATE_DIVISOR = 30

export function CoverageForm({ absentEmployees, coveringEmployees, counters }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [absentId, setAbsentId] = useState('')
  const [coveringId, setCoveringId] = useState('')
  const [counterId, setCounterId] = useState('')
  const [dateFrom, setDateFrom] = useState<Date | undefined>(new Date())
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date())
  const [ratePerDay, setRatePerDay] = useState('')
  const [fromOpen, setFromOpen] = useState(false)
  const [toOpen, setToOpen] = useState(false)

  function handleAbsentChange(id: string) {
    setAbsentId(id)
    const emp = absentEmployees.find((e) => e.id === id)
    if (emp) {
      const rate = emp.currentSalary / DAILY_RATE_DIVISOR
      setRatePerDay(rate.toFixed(2))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!dateFrom || !dateTo || !absentId || !coveringId || !counterId) {
      toast.error('Please fill in all required fields')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/coverage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          absentEmployeeId: absentId,
          coveringEmployeeId: coveringId,
          counterId,
          dateFrom: format(dateFrom, 'yyyy-MM-dd'),
          dateTo: format(dateTo, 'yyyy-MM-dd'),
          ratePerDay: parseFloat(ratePerDay),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? 'Failed to record coverage')
        return
      }
      toast.success('Coverage recorded')
      router.push('/coverage')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Absent Employee *</Label>
              <Select value={absentId} onValueChange={(v) => handleAbsentChange(v ?? '')} required items={absentEmployees.map((e) => ({ value: e.id, label: e.name }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Who was absent?" />
                </SelectTrigger>
                <SelectContent>
                  {absentEmployees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Covering Employee *</Label>
              <Select value={coveringId} onValueChange={(v) => setCoveringId(v ?? '')} required items={coveringEmployees.map((e) => ({ value: e.id, label: e.name }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Who covered?" />
                </SelectTrigger>
                <SelectContent>
                  {coveringEmployees
                    .filter((e) => e.id !== absentId)
                    .map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Counter *</Label>
              <Select value={counterId} onValueChange={(v) => setCounterId(v ?? '')} required items={counters.map((c) => ({ value: c.id, label: c.name }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Which counter?" />
                </SelectTrigger>
                <SelectContent>
                  {counters.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rate">Rate per Day (PKR) *</Label>
              <Input
                id="rate"
                type="number"
                value={ratePerDay}
                onChange={(e) => setRatePerDay(e.target.value)}
                placeholder="Auto-filled from absent employee"
                min={1}
                step="0.01"
                required
              />
              <p className="text-xs text-muted-foreground">
                Defaults to absent employee&apos;s daily rate. Edit if different.
              </p>
            </div>

            <div className="space-y-2">
              <Label>From *</Label>
              <Popover open={fromOpen} onOpenChange={setFromOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !dateFrom && 'text-muted-foreground'
                      )}
                    />
                  }
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, 'dd MMM yyyy') : 'Pick date'}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={(d) => {
                      setDateFrom(d)
                      if (d && (!dateTo || dateTo < d)) setDateTo(d)
                      setFromOpen(false)
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>To *</Label>
              <Popover open={toOpen} onOpenChange={setToOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !dateTo && 'text-muted-foreground'
                      )}
                    />
                  }
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, 'dd MMM yyyy') : 'Pick date'}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    disabled={dateFrom ? { before: dateFrom } : undefined}
                    onSelect={(d) => {
                      setDateTo(d)
                      setToOpen(false)
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Record Coverage'}
        </Button>
      </div>
    </form>
  )
}
