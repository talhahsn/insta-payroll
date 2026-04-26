import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { EmployeeDetailPageSkeleton } from '@/components/loading/table-page-skeletons'
import { getAuthUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { getEmployee } from '@/services/employee.service'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format } from 'date-fns'
import { ArrowLeft, Edit } from 'lucide-react'
import { EmployeeStatusToggle } from '@/components/employees/employee-status-toggle'
import { MarkLeftDialog } from '@/components/employees/mark-left-dialog'
import { SalaryHoldsCard } from '@/components/employees/salary-holds-card'
import { AppContentScrollPage } from '@/components/layout/list-page-layout'

export default function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <Suspense fallback={<EmployeeDetailPageSkeleton />}>
      <EmployeeDetailPageContent params={params} />
    </Suspense>
  )
}

async function EmployeeDetailPageContent({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  let authUser
  try {
    authUser = await getAuthUser()
  } catch {
    redirect('/login')
  }

  const { id } = await params
  let employee
  try {
    employee = await getEmployee(id, authUser)
  } catch {
    notFound()
  }

  const canManage = can(authUser, 'employees', 'manage')

  return (
    <AppContentScrollPage>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" render={<Link href="/employees" />}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div className="flex w-full items-center gap-2">
            <h1 className="text-2xl font-bold">{employee.name}</h1>
            <p className="text-muted-foreground">
              {employee.jobRoles.length > 0
                ? employee.jobRoles.map((jr) => jr.jobRole.name).join(', ')
                : 'No role assigned'}
            </p>
          </div>
        </div>
        {canManage && (
          <div className="flex gap-2">
            {employee.status === 'ACTIVE' ? (
              <MarkLeftDialog
                employeeId={employee.id}
                employeeName={employee.name}
                leftAt={employee.leftAt}
              />
            ) : (
              <EmployeeStatusToggle
                employeeId={employee.id}
                currentStatus={employee.status}
                employeeName={employee.name}
              />
            )}
            <Button render={<Link href={`/employees/${employee.id}/edit`} />}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current Salary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">PKR {employee.currentSalary.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Daily rate: PKR {(employee.currentSalary / 30).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Leave Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employee.leaveBalance} days</div>
            <p className="text-xs text-muted-foreground">Carry-forward available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Employment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant={employee.status === 'ACTIVE' ? 'default' : 'secondary'}>
                {employee.status}
              </Badge>
              <Badge variant="outline">{employee.employeeType.name}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Joined {format(employee.joinedAt, 'dd MMM yyyy')}
              {employee.leftAt && ` · Left ${format(employee.leftAt, 'dd MMM yyyy')}`}
            </p>
            {employee.phone && (
              <p className="text-xs text-muted-foreground mt-0.5">{employee.phone}</p>
            )}
            {employee.employeeCode && (
              <p className="text-xs text-muted-foreground mt-0.5 font-mono">{employee.employeeCode}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {employee.employeeType.isDepositEligible && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Security Deposit</CardTitle>
            <CardDescription>
              Month 1: {employee.depositDaysM1} days · Month 2: {employee.depositDaysM2} days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {employee.securityDeposit ? (
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Month 1 withheld</span>
                  <span>PKR {employee.securityDeposit.month1Withheld.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Month 2 withheld</span>
                  <span>PKR {employee.securityDeposit.month2Withheld.toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>Total withheld</span>
                  <span>PKR {employee.securityDeposit.totalWithheld.toLocaleString()}</span>
                </div>
                {employee.securityDeposit.releasedAt && (
                  <p className="text-xs text-muted-foreground pt-1">
                    Released on {format(employee.securityDeposit.releasedAt, 'dd MMM yyyy')}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No deposit recorded yet</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Salary History</CardTitle>
            <CardDescription>All salary changes</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Effective From</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employee.salaryHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground py-6">
                    No salary history
                  </TableCell>
                </TableRow>
              ) : (
                employee.salaryHistory.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{format(s.effectiveFrom, 'dd MMM yyyy')}</TableCell>
                    <TableCell className="text-right font-medium">
                      PKR {s.amount.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <SalaryHoldsCard
        employeeId={employee.id}
        canManage={canManage}
        holds={employee.salaryHolds}
      />

      {employee.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{employee.notes}</p>
          </CardContent>
        </Card>
      )}
      </div>
    </AppContentScrollPage>
  )
}
