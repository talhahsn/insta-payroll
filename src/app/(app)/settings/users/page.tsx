import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { SettingsUsersPageSkeleton } from '@/components/loading/table-page-skeletons'
import { getAuthUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { ListPageScrollRoot } from '@/components/layout/list-page-layout'
import { UsersTable } from '@/components/settings/users-table'

export default function UsersSettingsPage() {
  return (
    <Suspense fallback={<SettingsUsersPageSkeleton />}>
      <UsersSettingsContent />
    </Suspense>
  )
}

async function UsersSettingsContent() {
  let authUser
  try {
    authUser = await getAuthUser()
  } catch {
    redirect('/login')
  }

  if (!can(authUser, 'settings', 'manage')) redirect('/dashboard')

  const [users, roles] = await Promise.all([
    prisma.user.findMany({
      where: { restaurantId: authUser.restaurantId },
      include: { role: true },
      orderBy: { name: 'asc' },
    }),
    prisma.role.findMany({
      where: { restaurantId: authUser.restaurantId },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <ListPageScrollRoot className="mx-auto w-full max-w-2xl gap-6">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-muted-foreground">Manage who has access and their role</p>
      </div>
      <UsersTable
        users={users}
        roles={roles}
        currentUserId={authUser.id}
        isProtectedRole={authUser.isProtectedRole}
      />
    </ListPageScrollRoot>
  )
}
