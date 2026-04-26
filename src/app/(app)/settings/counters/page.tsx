import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { SettingsSimpleTablePageSkeleton } from '@/components/loading/table-page-skeletons'
import { getAuthUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { ListPageScrollRoot } from '@/components/layout/list-page-layout'
import { SimpleCrudTable } from '@/components/settings/simple-crud-table'

export default function CountersSettingsPage() {
  return (
    <Suspense fallback={<SettingsSimpleTablePageSkeleton />}>
      <CountersSettingsContent />
    </Suspense>
  )
}

async function CountersSettingsContent() {
  let authUser
  try {
    authUser = await getAuthUser()
  } catch {
    redirect('/login')
  }

  if (!can(authUser, 'settings', 'manage')) redirect('/dashboard')

  const counters = await prisma.counter.findMany({
    where: { restaurantId: authUser.restaurantId },
    orderBy: { name: 'asc' },
  })

  return (
    <ListPageScrollRoot className="mx-auto w-full max-w-2xl gap-6">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold">Counters</h1>
        <p className="text-muted-foreground">Manage counter stations used in shift coverage</p>
      </div>
      <SimpleCrudTable rows={counters} apiBase="/api/settings/counters" label="Counter" />
    </ListPageScrollRoot>
  )
}
