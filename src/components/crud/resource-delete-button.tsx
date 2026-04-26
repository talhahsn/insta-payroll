'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { getErrorMessageFromResponse } from '@/lib/api-client'
import { cn } from '@/lib/utils'

type Props = {
  /** e.g. `/api/advances/abc` — not encoded beyond normal URL building */
  href: string
  confirmMessage: string
  successMessage: string
  errorFallback?: string
  'aria-label'?: string
  className?: string
}

/**
 * confirm → `DELETE` → toast on error/success → `router.refresh()`.
 * Use for list-row deletes that share the same server JSON error shape.
 */
export function ResourceDeleteButton({
  href,
  confirmMessage,
  successMessage,
  errorFallback = 'Delete failed',
  'aria-label': ariaLabel = 'Delete',
  className,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm(confirmMessage)) return
    setLoading(true)
    try {
      const res = await fetch(href, { method: 'DELETE' })
      if (!res.ok) {
        const msg = await getErrorMessageFromResponse(res)
        toast.error(msg || errorFallback)
        return
      }
      toast.success(successMessage)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleDelete}
      disabled={loading}
      className={cn('h-8 w-8 text-destructive hover:text-destructive', className)}
      aria-label={ariaLabel}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}
