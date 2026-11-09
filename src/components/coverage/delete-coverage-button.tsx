'use client'

import { ResourceDeleteButton } from '@/components/crud/resource-delete-button'

export function DeleteCoverageButton({ id }: { id: string }) {
  return (
    <ResourceDeleteButton
      href={`/api/coverage/${id}`}
      confirmMessage="Delete this coverage record?"
      successMessage="Coverage deleted"
      errorFallback="Failed to delete coverage"
      invalidateKeys={['coverage']}
    />
  )
}
