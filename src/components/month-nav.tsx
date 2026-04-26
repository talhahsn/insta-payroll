'use client'

import { useState } from 'react'
import { useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { format, startOfMonth } from 'date-fns'
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export type MonthNavTransition = {
  isPending: boolean
  startTransition: (cb: () => void) => void
}

const START_YEAR = 2010

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i),
  label: format(new Date(2000, i, 1), 'MMMM'),
}))

function yearOptionsList() {
  const end = new Date().getFullYear() + 5
  return Array.from({ length: end - START_YEAR + 1 }, (_, i) => START_YEAR + i)
}

interface Props {
  month: Date
  /** When set (e.g. payroll page with table overlay), navigation uses this transition instead of an internal one. */
  transition?: MonthNavTransition
}

export function MonthNav({ month, transition: externalTransition }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const [internalPending, startInternal] = useTransition()
  const isPending = externalTransition?.isPending ?? internalPending
  const start = externalTransition?.startTransition ?? startInternal

  const m = startOfMonth(month)
  const monthIndex = m.getMonth()
  const year = m.getFullYear()

  const yearOptions = yearOptionsList().map((y) => String(y))
  const yearItems = yearOptions.map((y) => ({ value: y, label: y }))

  function navigate(yr: number, mon: number) {
    const target = startOfMonth(new Date(yr, mon, 1))
    const params = new URLSearchParams(searchParams.toString())
    params.set('month', format(target, 'yyyy-MM'))
    start(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
    setOpen(false)
  }

  return (
    <div className="flex items-center gap-2" aria-busy={isPending}>
      <Popover
        open={open}
        onOpenChange={(next) => {
          if (next && isPending) return
          setOpen(next)
        }}
      >
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              className="min-w-[10.5rem] justify-between gap-2 sm:min-w-[12rem]"
              disabled={isPending}
              aria-label="Select month and year"
              aria-expanded={open}
            />
          }
        >
          <span className="flex min-w-0 items-center gap-2">
            <CalendarIcon className="size-4 shrink-0 opacity-80" />
            <span className="truncate text-sm font-medium sm:text-base">{format(month, 'MMMM yyyy')}</span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent className="w-[min(100vw,18rem)] p-0" align="start" side="bottom" sideOffset={4}>
          <div
            className={cn('flex flex-col gap-3 p-3', isPending && 'pointer-events-none opacity-60')}
            role="group"
            aria-label="Month and year"
          >
            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="month-nav-month">
                Month
              </Label>
              <Select
                value={String(monthIndex)}
                onValueChange={(v) => {
                  if (v == null) return
                  const idx = parseInt(v, 10)
                  if (Number.isFinite(idx) && idx >= 0 && idx < 12) navigate(year, idx)
                }}
                items={MONTH_OPTIONS}
              >
                <SelectTrigger id="month-nav-month" className="h-8 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="month-nav-year">
                Year
              </Label>
              <Select
                value={String(year)}
                onValueChange={(v) => {
                  if (v == null) return
                  const y = parseInt(v, 10)
                  if (Number.isFinite(y)) navigate(y, monthIndex)
                }}
                items={yearItems}
              >
                <SelectTrigger id="month-nav-year" className="h-8 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
