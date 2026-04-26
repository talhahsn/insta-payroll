'use client'

import { ResourceDeleteButton } from '@/components/crud/resource-delete-button'

export function DeleteFestivalButton({ id }: { id: string }) {
  return (
    <ResourceDeleteButton
      href={`/api/festivals/${id}`}
      confirmMessage="Delete this festival event? All employee bonuses for this event will also be removed."
      successMessage="Festival event deleted"
      errorFallback="Failed to delete festival event"
    />
  )
}
