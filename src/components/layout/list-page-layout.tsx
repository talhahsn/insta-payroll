import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Fills the app main column so inner regions can use overflow-auto (table scroll, not page scroll).
 */
export function ListPageScrollRoot({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        'flex h-0 min-h-0 w-full min-w-0 flex-1 flex-col gap-4 overflow-hidden',
        className
      )}
    >
      {children}
    </div>
  )
}

/**
 * Bordered table area: only this sub-tree scrolls vertically.
 */
export function ScrollableTableRegion({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        'min-h-0 min-w-0 flex-1 overflow-auto overscroll-y-contain rounded-md border border-border/80 bg-card',
        className
      )}
    >
      {children}
    </div>
  )
}

/** For dashboard / long forms: scroll the page body instead of the shell. */
export function AppContentScrollPage({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('h-0 min-h-0 w-full min-w-0 flex-1 overflow-y-auto overscroll-y-contain', className)}>
      {children}
    </div>
  )
}
