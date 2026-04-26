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

export function FestivalForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [bonusType, setBonusType] = useState<'FIXED' | 'DAYS_SALARY'>('FIXED')
  const [bonusValue, setBonusValue] = useState('')
  const [eventDate, setEventDate] = useState<Date | undefined>(new Date())
  const [appliesToMonth, setAppliesToMonth] = useState<Date | undefined>(new Date())
  const [eventDateOpen, setEventDateOpen] = useState(false)
  const [monthOpen, setMonthOpen] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!eventDate || !appliesToMonth) {
      toast.error('Please fill in all required fields')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/festivals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          eventDate: format(eventDate, 'yyyy-MM-dd'),
          bonusType,
          bonusValue: parseFloat(bonusValue),
          appliesToMonth: format(appliesToMonth, 'yyyy-MM-dd'),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? 'Failed to create festival event')
        return
      }
      toast.success('Festival event created — bonuses generated for all employees')
      router.push('/festivals')
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
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Festival Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Eid ul Fitr"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Bonus Type *</Label>
              <Select
                value={bonusType}
                onValueChange={(v) => setBonusType((v ?? 'FIXED') as 'FIXED' | 'DAYS_SALARY')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIXED">Fixed amount (PKR)</SelectItem>
                  <SelectItem value="DAYS_SALARY">N × daily rate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bonusValue">
                {bonusType === 'FIXED' ? 'Amount (PKR) *' : 'Number of days *'}
              </Label>
              <Input
                id="bonusValue"
                type="number"
                value={bonusValue}
                onChange={(e) => setBonusValue(e.target.value)}
                placeholder={bonusType === 'FIXED' ? 'e.g. 5000' : 'e.g. 2'}
                min={0}
                step={bonusType === 'FIXED' ? '1' : '0.5'}
                required
              />
              {bonusType === 'DAYS_SALARY' && (
                <p className="text-xs text-muted-foreground">
                  Each employee receives N × (their salary ÷ 30)
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Event Date *</Label>
              <Popover open={eventDateOpen} onOpenChange={setEventDateOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !eventDate && 'text-muted-foreground'
                      )}
                    />
                  }
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {eventDate ? format(eventDate, 'dd MMM yyyy') : 'Pick date'}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={eventDate}
                    onSelect={(d) => { setEventDate(d); setEventDateOpen(false) }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Applies to Month *</Label>
              <Popover open={monthOpen} onOpenChange={setMonthOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !appliesToMonth && 'text-muted-foreground'
                      )}
                    />
                  }
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {appliesToMonth ? format(appliesToMonth, 'MMMM yyyy') : 'Pick month'}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={appliesToMonth}
                    onSelect={(d) => { setAppliesToMonth(d); setMonthOpen(false) }}
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                The payroll month this bonus will appear in
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Festival Bonus'}
        </Button>
      </div>
    </form>
  )
}
