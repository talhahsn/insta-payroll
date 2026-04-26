import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getAuthUser } from '@/lib/auth'
import { ROUTE_PERMISSIONS } from '@/lib/permissions'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { RestaurantHeaderLogo } from '@/components/layout/restaurant-logo'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { PermissionsProvider } from '@/components/providers/permissions-provider'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let authUser
  try {
    authUser = await getAuthUser()
  } catch {
    redirect('/login')
  }

  // Route-level permission enforcement
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? ''
  const matchedRoute = Object.keys(ROUTE_PERMISSIONS).find((route) =>
    pathname === route || pathname.startsWith(route + '/')
  )
  if (matchedRoute) {
    const required = ROUTE_PERMISSIONS[matchedRoute]
    if (!authUser.permissions.includes(required)) {
      redirect('/403')
    }
  }

  return (
    <PermissionsProvider
      permissions={authUser.permissions}
      roleId={authUser.roleId}
      roleName={authUser.roleName}
      isProtectedRole={authUser.isProtectedRole}
    >
      <SidebarProvider>
        <AppSidebar user={authUser} />
        <SidebarInset className="min-h-0 flex-1 overflow-hidden">
          <header className="flex h-14 shrink-0 items-stretch gap-2 border-b px-4">
            <div className="flex items-center md:hidden">
              <SidebarTrigger className="-ml-1" title="Open menu" />
            </div>
            <div
              className="w-px shrink-0 self-stretch bg-border md:hidden"
              aria-hidden="true"
            />
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <RestaurantHeaderLogo logoUrl={authUser.restaurant.logoUrl} />
              <span className="text-foreground truncate text-sm font-semibold">
                {authUser.restaurant.name}
              </span>
            </div>
          </header>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </PermissionsProvider>
  )
}
