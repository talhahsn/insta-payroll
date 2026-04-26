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
}

/**
 * Ties `MonthNav` to a `useTransition` and swaps the main block to `pendingTable` while
 * `router.push` is updating the `month` search param. Route `loading` / Suspense are often
 * skipped for same-segment search-param navigations, so this mirrors `PayrollShell`.
 */
export function MonthRoutedListShell({
  month,
  afterNav,
  pendingTable,
  children,
  className,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const transition: MonthNavTransition = { isPending, startTransition }

  return (
    <div
      className={cn('flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden', className)}
      role={isPending ? 'status' : undefined}
      aria-busy={isPending}
      aria-label={isPending ? 'Loading month' : undefined}
    >
      <div className="flex shrink-0 flex-wrap items-center gap-4 sm:gap-6">
        <MonthNav month={month} transition={transition} />
        {isPending && afterNav != null ? (
          <div className="flex flex-wrap gap-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : (
          afterNav ?? null
        )}
      </div>
      <div className="min-h-0 min-w-0 flex-1 flex flex-col">
        {isPending ? (
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
