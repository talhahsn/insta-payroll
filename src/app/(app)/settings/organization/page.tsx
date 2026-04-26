import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { ListPageScrollRoot } from '@/components/layout/list-page-layout'
import { OrganizationSettingsForm } from '@/components/settings/organization-settings-form'

export default async function OrganizationSettingsPage() {
  let authUser
  try {
    authUser = await getAuthUser()
  } catch {
    redirect('/login')
  }

  if (!can(authUser, 'settings', 'manage')) redirect('/dashboard')

  return (
    <ListPageScrollRoot className="mx-auto w-full max-w-2xl gap-6">
      <div className="shrink-0 space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Organization</h1>
        <p className="text-sm text-muted-foreground">
          Name, logo, and contact details for your business
        </p>
      </div>
      <OrganizationSettingsForm
        key={authUser.restaurant.updatedAt.toISOString()}
        initial={{
          name: authUser.restaurant.name,
          logoUrl: authUser.restaurant.logoUrl,
          phone: authUser.restaurant.phone,
          address: authUser.restaurant.address,
        }}
      />
    </ListPageScrollRoot>
  )
}
