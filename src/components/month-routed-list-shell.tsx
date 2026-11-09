'use client'

import { useTransition, type ReactNode } from 'react'
import { MonthNav, type MonthNavTransition } from '@/components/month-nav'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type Props = {
  month: Date
  /** e.g. cash/food summary chips next to the month (hidden while loading) */
  afterNav?: ReactNode
  /** Shown when the user changes month and the RSC is still refetching */
  pendingTable: ReactNode
  children: ReactNode
  className?: string
  /**
   * When set, month changes stay on the client (no RSC remount).
   * Pending UI is then owned by the child (e.g. React Query).
   */
  onMonthChange?: (month: Date) => void
  /** When true with client-owned month, show pendingTable (e.g. RQ isPending). */
  isFetching?: boolean
}

/**
 * Ties `MonthNav` to month changes. Default path uses `router.push` + transition skeleton.
 * Pass `onMonthChange` for client-owned months (TanStack Query lists).
 */
export function MonthRoutedListShell({
  month,
  afterNav,
  pendingTable,
  children,
  className,
  onMonthChange,
  isFetching = false,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const transition: MonthNavTransition = { isPending, startTransition }
  const clientOwned = Boolean(onMonthChange)
  const showPending = clientOwned ? isFetching : isPending

  return (
    <div
      className={cn('flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden', className)}
      role={showPending ? 'status' : undefined}
      aria-busy={showPending}
      aria-label={showPending ? 'Loading month' : undefined}
    >
      <div className="flex shrink-0 flex-wrap items-center gap-4 sm:gap-6">
        <MonthNav
          month={month}
          transition={clientOwned ? undefined : transition}
          onMonthChange={onMonthChange}
        />
        {showPending && afterNav != null ? (
          <div className="flex flex-wrap gap-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : (
          afterNav ?? null
        )}
      </div>
      <div className="min-h-0 min-w-0 flex-1 flex flex-col">
        {showPending ? (
          <div className="min-h-0 flex-1 overflow-auto overscroll-y-contain">
            {pendingTable}
          </div>
        ) : (
          <div className="min-h-0 min-w-0 flex-1 flex flex-col overflow-hidden">{children}</div>
        )}
      </div>
    </div>
  )
}
