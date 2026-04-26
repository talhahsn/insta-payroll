import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { AppContentScrollPage } from '@/components/layout/list-page-layout'
import { FestivalForm } from '@/components/festivals/festival-form'

export default async function NewFestivalPage() {
  let authUser
  try {
    authUser = await getAuthUser()
  } catch {
    redirect('/login')
  }

  if (!can(authUser, 'festivals', 'manage')) redirect('/festivals')

  return (
    <AppContentScrollPage className="mx-auto w-full max-w-2xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Add Festival Bonus</h1>
          <p className="text-muted-foreground">
            Create an event and bonuses will be auto-generated for all active employees
          </p>
        </div>
        <FestivalForm />
      </div>
    </AppContentScrollPage>
  )
}
