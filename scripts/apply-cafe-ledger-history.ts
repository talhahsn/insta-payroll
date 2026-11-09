/**
 * Applies data/cafe-ledger-migration-preview.json: monthly payrolls, reconciliation
 * (advance or festival bonus so net matches the sheet), disbursements, DONE status.
 *
 * Run after: npm run seed  (needs employees + at least one User in the restaurant)
 * Usage: npm run ledger:apply
 */
import 'dotenv/config'
import { readFileSync } from 'fs'
import { join } from 'path'
import { endOfMonth, startOfMonth } from 'date-fns'
import { prisma } from '@/lib/prisma'
import { calculatePayroll } from '@/services/payroll.service'
import { monthKeyFromYearMonth, toMonthKey } from '@/lib/month-key'

function loadLedgerJson(): { by_month: Array<{ month: string; rows: Array<{ name: string; baseSalary: number; netFromPdf: number }> }> } {
  const p = join(process.cwd(), 'data/cafe-ledger-migration-preview.json')
  return JSON.parse(readFileSync(p, 'utf-8')) as {
    by_month: Array<{
      month: string
      rows: Array<{ name: string; baseSalary: number; netFromPdf: number }>
    }>
  }
}

function parseMonthKey(key: string): Date {
  const [y, m] = key.split('-').map(Number)
  return monthKeyFromYearMonth(y, m)
}

const NOTE_BACKFILL = 'Cafe ledger backfill (historical migration)'
const NOTE_DISB = 'Cafe ledger historical (paid)'

const EPS = 0.5

/**
 * Remove every `MonthlyPayroll` for this restaurant + month (and dependent rows) so
 * the JSON is the only source of truth for that month when we re-apply.
 */
async function deleteAllPayrollsForMonth(restaurantId: string, monthStart: Date) {
  const payrolls = await prisma.monthlyPayroll.findMany({
    where: { restaurantId, month: monthStart },
    select: { id: true },
  })
  const ids = payrolls.map((p) => p.id)
  if (ids.length === 0) return

  await prisma.$transaction(async (tx) => {
    await tx.disbursement.deleteMany({ where: { monthlyPayrollId: { in: ids } } })
    await tx.festivalBonus.deleteMany({ where: { monthlyPayrollId: { in: ids } } })
    await tx.advance.deleteMany({ where: { monthlyPayrollId: { in: ids } } })
    await tx.leave.deleteMany({ where: { monthlyPayrollId: { in: ids } } })
    await tx.shiftCoverage.deleteMany({
      where: { OR: [{ payrollIdAbsent: { in: ids } }, { payrollIdCovering: { in: ids } }] },
    })
    await tx.salaryHold.updateMany({
      where: { releasedInPayrollId: { in: ids } },
      data: { releasedInPayrollId: null, releasedAt: null },
    })
    for (const id of ids) {
      await tx.securityDeposit.updateMany({
        where: { month1PayrollId: id },
        data: { month1PayrollId: null, month1Withheld: 0 },
      })
      await tx.securityDeposit.updateMany({
        where: { month2PayrollId: id },
        data: { month2PayrollId: null, month2Withheld: 0 },
      })
      await tx.securityDeposit.updateMany({
        where: { releasedInPayrollId: id },
        data: { releasedInPayrollId: null, releasedAt: null },
      })
    }
    await tx.monthlyPayroll.deleteMany({ where: { id: { in: ids } } })
  })
}

async function getBackfillFestivalEvent(restaurantId: string, monthKey: string, monthStart: Date) {
  const name = `Cafe ledger backfill (${monthKey})`
  const existing = await prisma.festivalEvent.findFirst({
    where: { restaurantId, name, appliesToMonth: monthStart },
  })
  if (existing) return existing
  return prisma.festivalEvent.create({
    data: {
      name,
      eventDate: endOfMonth(monthStart),
      bonusType: 'FIXED',
      bonusValue: 1,
      appliesToMonth: monthStart,
      restaurantId,
    },
  })
}

async function clearPriorLedgerData(payrollId: string) {
  await prisma.disbursement.deleteMany({
    where: { monthlyPayrollId: payrollId, notes: { contains: 'Cafe ledger' } },
  })
  await prisma.advance.deleteMany({
    where: { monthlyPayrollId: payrollId, notes: { contains: 'Cafe ledger' } },
  })
  await prisma.festivalBonus.deleteMany({
    where: {
      monthlyPayrollId: payrollId,
      festivalEvent: { name: { startsWith: 'Cafe ledger backfill' } },
    },
  })
  await prisma.monthlyPayroll.update({
    where: { id: payrollId },
    data: { amountPaid: 0, status: 'PENDING' },
  })
}

async function syncAmountPaid(payrollId: string) {
  const agg = await prisma.disbursement.aggregate({
    where: { monthlyPayrollId: payrollId },
    _sum: { amount: true },
  })
  const total = agg._sum.amount ?? 0
  await prisma.monthlyPayroll.update({
    where: { id: payrollId },
    data: { amountPaid: total },
  })
}

async function applyRow(params: {
  name: string
  baseSalary: number
  targetNet: number
  month: Date
  monthKey: string
  restaurantId: string
  actorId: string
}) {
  const { name, baseSalary, targetNet, month, monthKey, restaurantId, actorId } = params
  const monthStart = toMonthKey(month)
  const payDate = endOfMonth(month)

  const employee = await prisma.employee.findFirst({
    where: { name, restaurantId },
  })
  if (!employee) {
    console.warn(`  [skip] no employee: "${name}"`)
    return
  }

  const payroll = await prisma.monthlyPayroll.upsert({
    where: { employeeId_month: { employeeId: employee.id, month: monthStart } },
    create: {
      employeeId: employee.id,
      month: monthStart,
      baseSalary,
      status: 'PENDING',
      restaurantId,
      isLedgerBackfill: true,
    },
    update: { baseSalary, isLedgerBackfill: true },
  })

  await clearPriorLedgerData(payroll.id)

  let net0 = (await calculatePayroll(employee.id, month, 'EXPECTED', restaurantId)).netPayable

  const down = net0 - targetNet
  if (down > EPS) {
    await prisma.advance.create({
      data: {
        employeeId: employee.id,
        monthlyPayrollId: payroll.id,
        amount: down,
        type: 'CASH',
        date: payDate,
        notes: NOTE_BACKFILL,
        createdById: actorId,
        restaurantId,
      },
    })
  } else if (down < -EPS) {
    const need = -down
    const ev = await getBackfillFestivalEvent(restaurantId, monthKey, monthStart)
    await prisma.festivalBonus.upsert({
      where: {
        festivalEventId_monthlyPayrollId: {
          festivalEventId: ev.id,
          monthlyPayrollId: payroll.id,
        },
      },
      create: {
        festivalEventId: ev.id,
        monthlyPayrollId: payroll.id,
        amount: need,
        restaurantId,
      },
      update: { amount: need },
    })
  }

  const net1 = (await calculatePayroll(employee.id, month, 'EXPECTED', restaurantId)).netPayable
  if (Math.abs(net1 - targetNet) > EPS && (targetNet > 0 || Math.abs(net1) > EPS)) {
    console.warn(
      `  [warn] ${name} ${monthKey}: target ${targetNet} vs computed ${net1} (check join/leave/deposit in DB)`
    )
  }

  if (targetNet > 0) {
    await prisma.disbursement.create({
      data: {
        monthlyPayrollId: payroll.id,
        amount: targetNet,
        paidAt: payDate,
        notes: NOTE_DISB,
        recordedById: actorId,
        restaurantId,
      },
    })
  } else {
    // $0 net: still record a zero disbursement so the app treats the month as ledger-sourced.
    await prisma.disbursement.create({
      data: {
        monthlyPayrollId: payroll.id,
        amount: 0,
        paidAt: payDate,
        notes: NOTE_DISB,
        recordedById: actorId,
        restaurantId,
      },
    })
  }

  await syncAmountPaid(payroll.id)
  const finalRemaining =
    (await calculatePayroll(employee.id, month, 'EXPECTED', restaurantId)).remainingToPay

  await prisma.monthlyPayroll.update({
    where: { id: payroll.id },
    data: { status: Math.abs(finalRemaining) < EPS ? 'DONE' : 'PARTIALLY_PAID' },
  })

  console.log(`  ${name} ${monthKey}: net ${targetNet} -> ${Math.abs(finalRemaining) < EPS ? 'OK' : 'REVIEW'}`)
}

async function main() {
  if (!process.env['DATABASE_URL']) {
    throw new Error('DATABASE_URL is required')
  }

  const data = loadLedgerJson()
  const restaurant = await prisma.restaurant.findUnique({ where: { slug: 'cafe-mantra' } })
  if (!restaurant) {
    throw new Error('Restaurant slug cafe-mantra not found — run seed first')
  }
  const actor = await prisma.user.findFirst({ where: { restaurantId: restaurant.id } })
  if (!actor) {
    throw new Error('No user in DB for this restaurant — create one in app UI first')
  }

  console.log('Cafe ledger historical migration\nRestaurant:', restaurant.name, 'Actor user:', actor.id, '\n')

  for (const block of data.by_month) {
    const m = parseMonthKey(block.month)
    const monthStart = toMonthKey(m)
    await deleteAllPayrollsForMonth(restaurant.id, monthStart)
    console.log('Month', block.month, `(${block.rows.length} rows) — replaced month in DB`)
    for (const row of block.rows) {
      await applyRow({
        name: row.name,
        baseSalary: row.baseSalary,
        targetNet: row.netFromPdf,
        month: m,
        monthKey: block.month,
        restaurantId: restaurant.id,
        actorId: actor.id,
      })
    }
  }

  console.log('\nDone.')
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
