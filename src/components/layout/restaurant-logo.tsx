'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Header: optional square logo; hidden if missing or load error. */
export function RestaurantHeaderLogo({
  logoUrl,
  className,
}: {
  logoUrl: string | null | undefined
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    setFailed(false)
  }, [logoUrl])

  if (!logoUrl || failed) return null
  return (
    <img
      src={logoUrl}
      alt=""
      className={cn('h-7 w-7 shrink-0 rounded-md object-contain', className)}
      onError={() => setFailed(true)}
    />
  )
}

/** Sidebar: logo or fallback (e.g. initials badge). */
export function RestaurantLogoOrFallback({
  logoUrl,
  fallback,
  imgClassName,
}: {
  logoUrl: string | null | undefined
  fallback: ReactNode
  imgClassName?: string
}) {
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    setFailed(false)
  }, [logoUrl])

  if (!logoUrl || failed) return <>{fallback}</>
  return (
    <img
      src={logoUrl}
      alt=""
      className={cn('h-8 w-8 shrink-0 rounded-lg object-contain', imgClassName)}
      onError={() => setFailed(true)}
    />
  )
}
