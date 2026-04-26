import { cn } from '@/lib/utils'

/** Sticky, blurred header row for data tables in scroll areas. */
export const TABLE_HEADER_STICKY =
  'sticky top-0 z-20 border-b bg-background/95 shadow-sm supports-[backdrop-filter]:backdrop-blur-sm [&_tr]:border-b-0'

export function tableHeaderStickyClassName(className?: string) {
  return cn(TABLE_HEADER_STICKY, className)
}
