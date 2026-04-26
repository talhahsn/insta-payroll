import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { AppContentScrollPage } from '@/components/layout/list-page-layout'
import { AccessRolesClient } from './access-roles-client'

export default async function AccessRolesPage() {
  let authUser
  try {
    authUser = await getAuthUser()
  } catch {
    redirect('/login')
  }

  if (!can(authUser, 'settings', 'manage')) redirect('/dashboard')

  const roles = await prisma.role.findMany({
    where: { restaurantId: authUser.restaurantId },
    include: { permissions: true, _count: { select: { users: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return (
    <AppContentScrollPage className="mx-auto w-full max-w-3xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Access Roles</h1>
          <p className="text-muted-foreground">Manage roles and their permissions</p>
        </div>
        <AccessRolesClient
          roles={roles}
          isProtectedRole={authUser.isProtectedRole}
        />
      </div>
    </AppContentScrollPage>
  )
}
