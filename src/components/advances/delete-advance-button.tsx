'use client'

import { ResourceDeleteButton } from '@/components/crud/resource-delete-button'

export function DeleteAdvanceButton({ id }: { id: string }) {
  return (
    <ResourceDeleteButton
      href={`/api/advances/${id}`}
      confirmMessage="Delete this advance record?"
      successMessage="Advance deleted"
      errorFallback="Failed to delete advance"
      invalidateKeys={['advances']}
    />
  )
}
