'use client'

import { ResourceDeleteButton } from '@/components/crud/resource-delete-button'

export function DeleteLeaveButton({ id }: { id: string }) {
  return (
    <ResourceDeleteButton
      href={`/api/leaves/${id}`}
      confirmMessage="Delete this leave record?"
      successMessage="Leave deleted"
      errorFallback="Failed to delete leave"
    />
  )
}
