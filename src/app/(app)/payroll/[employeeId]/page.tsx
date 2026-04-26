import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { Suspense } from 'react'
import { PayrollDetailPageSkeleton } from '@/components/loading/table-page-skeletons'
import { format, startOfMonth } from 'date-fns'
import { ArrowLeft } from 'lucide-react'
import { getAuthUser } from '@/lib/auth'
import { parseMonthFromQuery } from '@/lib/month-query'
import { can } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { calculatePayroll } from '@/services/payroll.service'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { RecordPaymentDialog } from '@/components/payroll/record-payment-dialog'
import { AppContentScrollPage } from '@/components/layout/list-page-layout'
import { formatPkr } from '@/lib/format-money'

const fmt = formatPkr

function LineRow({
  label,
  value,
  type = 'neutral',
  bold = false,
}: {
  label: string
  value: number
  type?: 'earning' | 'deduction' | 'neutral'
  bold?: boolean
}) {
  const colorClass =
    type === 'earning' ? 'text-green-600' :
    type === 'deduction' ? 'text-destructive' : ''
  const prefix = type === 'earning' ? '+' : type === 'deduction' ? '−' : ''

  return (
    <TableRow>
      <TableCell className={bold ? 'font-semibold' : ''}>{label}</TableCell>
      <TableCell className={`text-right ${colorClass} ${bold ? 'font-semibold' : ''}`}>
        {prefix}{fmt(Math.abs(value))}
      </TableCell>
    </TableRow>
  )
}

export default function PayrollDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ employeeId: string }>
  searchParams: Promise<{ month?: string; view?: string }>
}) {
  return (
    <Suspense fallback={<PayrollDetailPageSkeleton />}>
      <PayrollDetailPageContent params={params} searchParams={searchParams} />
    </Suspense>
  )
}

async function PayrollDetailPageContent({
  params,
  searchParams,
}: {
  params: Promise<{ employeeId: string }>
  searchParams: Promise<{ month?: string; view?: string }>
}) {
  let authUser
  try {
    authUser = await getAuthUser()
  } catch {
    redirect('/login')
  }

  const { employeeId } = await params
  const { month: monthParam, view: viewParam } = await searchParams
  const month = parseMonthFromQuery(monthParam)
  const viewType = viewParam === 'EXPECTED' ? 'EXPECTED' : 'LIVE'

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, restaurantId: authUser.restaurantId },
    include: { jobRoles: { include: { jobRole: true } }, employeeType: true },
  })
  if (!employee) notFound()

  const calc = await calculatePayroll(employeeId, month, viewType, authUser.restaurantId)

  const monthStart = startOfMonth(month)
  const payroll = await prisma.monthlyPayroll.findUnique({
    where: { employeeId_month: { employeeId, month: monthStart } },
    include: {
      disbursements: {
        include: { recordedBy: { select: { name: true } } },
        orderBy: { paidAt: 'desc' },
      },
    },
  })

  const backParams = new URLSearchParams()
  if (monthParam) backParams.set('month', monthParam)
  backParams.set('view', viewType)

  const canRecordPayment = can(authUser, 'payroll', 'record_payment')

  return (
    <AppContentScrollPage className="mx-auto w-full max-w-2xl">
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" render={<Link href={`/payroll?${backParams.toString()}`} />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{calc.employeeName}</h1>
          <p className="text-muted-foreground">
            {employee.jobRoles.length > 0
              ? employee.jobRoles.map((jr) => jr.jobRole.name).join(', ')
              : employee.employeeType.name} · {format(month, 'MMMM yyyy')}
            {' · '}
            <Badge variant={viewType === 'LIVE' ? 'default' : 'secondary'} className="text-xs">
              {viewType}
            </Badge>
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Calculation Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableBody>
              <LineRow label={`Base salary (${calc.workingDays} of 30 days × ${fmt(calc.dailyRate)}/day)`} value={calc.baseEarned} type="earning" />
              {calc.coverageBonus > 0 && <LineRow label="Shift coverage bonus" value={calc.coverageBonus} type="earning" />}
              {calc.festivalBonus > 0 && <LineRow label="Festival bonuses" value={calc.festivalBonus} type="earning" />}
              {calc.securityDepositRelease > 0 && <LineRow label="Security deposit release" value={calc.securityDepositRelease} type="earning" />}
              {calc.salaryHoldRelease > 0 && <LineRow label="Withheld salary release" value={calc.salaryHoldRelease} type="earning" />}

              <TableRow>
                <TableCell colSpan={2} className="py-1">
                  <Separator />
                </TableCell>
              </TableRow>

              <LineRow label="Gross earned" value={calc.grossEarned} bold />

              {calc.leaveDeduction > 0 && (
                <LineRow
                  label={`Leave deduction (${calc.leaveDays} days, ${calc.freeLeaves} free)`}
                  value={calc.leaveDeduction}
                  type="deduction"
                />
              )}
              {calc.advancesTotal > 0 && <LineRow label="Cash advances" value={calc.advancesTotal} type="deduction" />}
              {calc.foodExpensesTotal > 0 && <LineRow label="Food expenses" value={calc.foodExpensesTotal} type="deduction" />}
              {calc.securityDepositDeduction > 0 && <LineRow label="Security deposit withheld" value={calc.securityDepositDeduction} type="deduction" />}
              {calc.salaryHoldDeduction > 0 && <LineRow label="Salary withheld" value={calc.salaryHoldDeduction} type="deduction" />}

              {calc.totalDeductions > 0 && (
                <>
                  <TableRow>
                    <TableCell colSpan={2} className="py-1">
                      <Separator />
                    </TableCell>
                  </TableRow>
                  <LineRow label="Total deductions" value={calc.totalDeductions} bold />
                </>
              )}

              <TableRow>
                <TableCell colSpan={2} className="py-1">
                  <Separator />
                </TableCell>
              </TableRow>

              <TableRow className="bg-muted/40">
                <TableCell className="font-bold text-base">Net Payable</TableCell>
                <TableCell className="text-right font-bold text-base">{fmt(calc.netPayable)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-muted-foreground">Amount paid</TableCell>
                <TableCell className="text-right text-muted-foreground">{fmt(calc.amountPaid)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">Remaining to pay</TableCell>
                <TableCell className={`text-right font-semibold ${
                  calc.netPayable <= 0 ? 'text-destructive' :
                  calc.remainingToPay > 0 ? 'text-orange-500' : 'text-green-600'
                }`}>
                  {calc.netPayable <= 0
                    ? `In debt (${fmt(Math.abs(calc.netPayable))} owed back)`
                    : calc.remainingToPay > 0
                      ? fmt(calc.remainingToPay)
                      : 'Fully paid'}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Payment History</CardTitle>
          {canRecordPayment && calc.remainingToPay > 0 && (
            <RecordPaymentDialog
              employeeId={employeeId}
              monthStr={monthParam ?? format(month, 'yyyy-MM')}
              remaining={calc.remainingToPay}
            />
          )}
        </CardHeader>
        <CardContent>
          {!payroll?.disbursements.length ? (
            <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {payroll.disbursements.map((d) => (
                <div key={d.id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">{fmt(d.amount)}</span>
                    <span className="text-muted-foreground ml-2">
                      {format(d.paidAt, 'dd MMM yyyy')}
                      {d.notes && ` · ${d.notes}`}
                    </span>
                  </div>
                  <span className="text-muted-foreground text-xs">{d.recordedBy.name}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </AppContentScrollPage>
  )
}
