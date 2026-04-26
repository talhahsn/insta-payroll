import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Banknote, CalendarDays, TrendingUp } from 'lucide-react'
import { format, startOfMonth } from 'date-fns'

export default async function DashboardPage() {
  let authUser
  try {
    authUser = await getAuthUser()
  } catch {
    redirect('/login')
  }

  const canViewAll = can(authUser, 'employees', 'view_all')
  const restaurantId = authUser.restaurantId
  const currentMonth = startOfMonth(new Date())

  const [activeEmployees, pendingPayrolls, totalAdvancesThisMonth] = await Promise.all([
    prisma.employee.count({
      where: {
        restaurantId,
        status: 'ACTIVE',
        ...(!canViewAll && { employeeType: { isHiddenFromManager: false } }),
      },
    }),
    prisma.monthlyPayroll.count({
      where: {
        restaurantId,
        month: currentMonth,
        status: { not: 'DONE' },
        ...(!canViewAll && { employee: { employeeType: { isHiddenFromManager: false } } }),
      },
    }),
    prisma.advance.aggregate({
      where: {
        employee: { restaurantId },
        monthlyPayroll: { month: currentMonth },
      },
      _sum: { amount: true },
    }),
  ])

  const monthQuery = format(currentMonth, 'yyyy-MM')
  const stats = [
    {
      title: 'Active Employees',
      value: activeEmployees,
      icon: Users,
      description: 'Currently employed',
      href: '/employees',
    },
    {
      title: 'Pending Payrolls',
      value: pendingPayrolls,
      icon: Banknote,
      description: `For ${format(currentMonth, 'MMMM yyyy')}`,
      href: `/payroll?month=${monthQuery}`,
    },
    {
      title: 'Advances This Month',
      value: `PKR ${(totalAdvancesThisMonth._sum.amount ?? 0).toLocaleString()}`,
      icon: TrendingUp,
      description: 'Cash + food expenses',
      href: `/advances?month=${monthQuery}`,
    },
    {
      title: 'Current Month',
      value: format(currentMonth, 'MMMM yyyy'),
      icon: CalendarDays,
      description: 'Active payroll period',
      href: `/payroll?month=${monthQuery}`,
    },
  ]

  return (
    <div className="h-0 min-h-0 w-full min-w-0 flex-1 space-y-8 overflow-y-auto overscroll-y-contain">
      <div className="space-y-1.5">
        <h1 className="font-sans text-2xl font-semibold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Overview for {format(currentMonth, 'MMMM yyyy')}
        </p>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.title}
            href={stat.href}
            className="group block min-w-0 rounded-xl outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
            aria-label={`View ${stat.title}`}
          >
            <Card className="h-full cursor-pointer border border-border/60 bg-card shadow-sm transition-[box-shadow,ring-color] group-hover:shadow-md group-hover:ring-1 group-hover:ring-primary/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium leading-none text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
                  aria-hidden
                />
              </CardHeader>
              <CardContent className="space-y-1.5">
                <div className="font-sans text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                  {stat.value}
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
