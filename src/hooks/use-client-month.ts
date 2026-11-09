'use client'

import { useCallback, useMemo, useState } from 'react'
import { format, startOfMonth } from 'date-fns'
import { parseMonthFromQuery } from '@/lib/month-query'

/** Client-owned month with URL sync via history.replaceState (no RSC remount). */
export function useClientMonth(initialMonthParam?: string, pathname = '') {
  const [month, setMonth] = useState(() => parseMonthFromQuery(initialMonthParam))
  const monthParam = useMemo(() => format(startOfMonth(month), 'yyyy-MM'), [month])

  const onMonthChange = useCallback(
    (next: Date) => {
      const normalized = startOfMonth(next)
      setMonth(normalized)
      const params = new URLSearchParams()
      params.set('month', format(normalized, 'yyyy-MM'))
      const base = pathname || (typeof window !== 'undefined' ? window.location.pathname : '')
      const href = `${base}?${params.toString()}`
      if (typeof window !== 'undefined') {
        window.history.replaceState(window.history.state, '', href)
      }
    },
    [pathname]
  )

  return { month, monthParam, onMonthChange }
}
