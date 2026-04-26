import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { SettingsSimpleTablePageSkeleton } from '@/components/loading/table-page-skeletons'
import { getAuthUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { ListPageScrollRoot } from '@/components/layout/list-page-layout'
import { SimpleCrudTable } from '@/components/settings/simple-crud-table'

export default function JobTitlesSettingsPage() {
  return (
    <Suspense fallback={<SettingsSimpleTablePageSkeleton />}>
      <JobTitlesSettingsContent />
    </Suspense>
  )
}

async function JobTitlesSettingsContent() {
  let authUser
  try {
    authUser = await getAuthUser()
  } catch {
    redirect('/login')
  }

  if (!can(authUser, 'settings', 'manage')) redirect('/dashboard')

  const roles = await prisma.jobRole.findMany({
    where: { restaurantId: authUser.restaurantId },
    orderBy: { name: 'asc' },
  })

  return (
    <ListPageScrollRoot className="mx-auto w-full max-w-2xl gap-6">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold">Job Titles</h1>
        <p className="text-muted-foreground">Manage job titles assigned to employees</p>
      </div>
      <SimpleCrudTable rows={roles} apiBase="/api/settings/roles" label="Job Title" />
    </ListPageScrollRoot>
  )
}
