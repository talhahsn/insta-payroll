'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useCan } from '@/components/providers/permissions-provider'
import { cn } from '@/lib/utils'
import type { AuthUser } from '@/types/auth.types'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  sidebarMenuButtonVariants,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { RestaurantLogoOrFallback } from '@/components/layout/restaurant-logo'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Banknote,
  ArrowLeftRight,
  Star,
  Settings,
  Building2,
  ChevronUp,
  LogOut,
  UserCog,
  Shield,
} from 'lucide-react'

interface AppSidebarProps {
  user: AuthUser
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/employees', label: 'Employees', icon: Users },
  { href: '/payroll', label: 'Payroll', icon: Banknote },
  { href: '/leaves', label: 'Leaves', icon: CalendarDays },
  { href: '/advances', label: 'Advances', icon: Banknote },
  { href: '/coverage', label: 'Shift Coverage', icon: ArrowLeftRight },
  { href: '/festivals', label: 'Festivals', icon: Star },
]

const accessSettingsItems = [
  { href: '/settings/users', label: 'Users', icon: UserCog },
  { href: '/settings/access-roles', label: 'Access Roles', icon: Shield },
]

const configSettingsItems = [
  { href: '/settings/organization', label: 'Organization', icon: Building2 },
  { href: '/settings/employee-types', label: 'Employee Types', icon: Settings },
  { href: '/settings/roles', label: 'Job Titles', icon: Settings },
  { href: '/settings/counters', label: 'Counters', icon: Settings },
]

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const canViewSettings = useCan('settings', 'view')
  const canManageSettings = useCan('settings', 'manage')

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
    toast.success('Signed out')
  }

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-1 px-1 py-1">
          <SidebarTrigger className="hidden shrink-0 md:flex" title="Toggle sidebar" />
          <div className="flex min-w-0 flex-1 items-center gap-2 pl-0.5 pr-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:pl-0">
            <RestaurantLogoOrFallback
              logoUrl={user.restaurant.logoUrl}
              fallback={
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                  IP
                </div>
              }
            />
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <div className="flex flex-col">
                <span className="text-sm font-semibold">Insta Payroll</span>
                <span className="text-sidebar-foreground/70 max-w-35 truncate text-xs">
                  {user.restaurant.name}
                </span>
              </div>
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
                  tooltip={item.label}
                  render={<Link href={item.href} />}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {canManageSettings && (
          <SidebarGroup>
            <SidebarGroupLabel>Access</SidebarGroupLabel>
            <SidebarMenu>
              {accessSettingsItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    tooltip={item.label}
                    render={<Link href={item.href} />}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        )}

        {canViewSettings && (
          <SidebarGroup>
            <SidebarGroupLabel>Config</SidebarGroupLabel>
            <SidebarMenu>
              {configSettingsItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    tooltip={item.label}
                    render={<Link href={item.href} />}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  sidebarMenuButtonVariants({ variant: 'default', size: 'default' }),
                  'h-auto w-full py-2',
                  'group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0'
                )}
              >
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 text-left group-data-[collapsible=icon]:hidden">
                  <span className="text-sm font-medium">{user.name}</span>
                  <span className="text-xs text-muted-foreground block">{user.roleName}</span>
                </div>
                <ChevronUp className="ml-auto h-4 w-4 shrink-0 group-data-[collapsible=icon]:hidden" />
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-52">
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
