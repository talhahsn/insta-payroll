/**
 * Seed: Cafe Mantra
 *
 * Extracted from Cafe Ledger PDF (Jan 2025 → Mar 2026).
 * Active employees reflect March 2026 roster (per user instructions).
 * Inactive employees include all historical staff for reporting purposes.
 *
 * Run: npm run seed
 *
 * April 2026 cash advances: seeded when at least one App User exists (after /[slug]/setup).
 * Re-run `npm run seed` after setup on a fresh DB, or they are skipped the first time.
 */

import 'dotenv/config'
import { startOfMonth } from 'date-fns'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const pool = new Pool({ connectionString: process.env['DIRECT_URL'] ?? process.env['DATABASE_URL']! })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

function d(year: number, month: number, day: number) {
  return new Date(year, month - 1, day)
}

let codeCounter = 1
function nextCode() {
  return `EMP-${String(codeCounter++).padStart(3, '0')}`
}

async function initCodeCounter() {
  const count = await prisma.employee.count({ where: { restaurantId: restaurant.id } })
  codeCounter = count + 1
}

type EmployeeSeed = {
  name: string
  employeeTypeId: string
  jobRoleId?: string
  joinedAt: Date
  leftAt?: Date
  currentSalary: number
  billingCycleDay?: number
  notes?: string
  // List of {amount, effectiveFrom} — first entry is joining salary
  salaryHistory: { amount: number; effectiveFrom: Date }[]
}

async function seedEmployee(e: EmployeeSeed) {
  const code = nextCode()

  const existing = await prisma.employee.findFirst({
    where: { name: e.name, restaurantId: restaurant.id },
  })
  if (existing) {
    console.log(`  skip (exists): ${e.name}`)
    return existing
  }

  const employee = await prisma.employee.create({
    data: {
      employeeCode: code,
      name: e.name,
      employeeTypeId: e.employeeTypeId,
      jobRoles: e.jobRoleId ? { create: [{ jobRoleId: e.jobRoleId }] } : undefined,
      joinedAt: e.joinedAt,
      leftAt: e.leftAt ?? null,
      currentSalary: e.currentSalary,
      billingCycleDay: e.billingCycleDay ?? null,
      status: e.leftAt ? 'INACTIVE' : 'ACTIVE',
      notes: e.notes ?? null,
      restaurantId: restaurant.id,
    },
  })

  await prisma.salaryHistory.createMany({
    data: e.salaryHistory.map((s) => ({
      employeeId: employee.id,
      amount: s.amount,
      effectiveFrom: s.effectiveFrom,
      restaurantId: restaurant.id,
    })),
    skipDuplicates: true,
  })

  console.log(`  seeded: ${e.name} (${code})`)
  return employee
}

/**
 * Match repositories/payroll.repository.getOrCreateMonthlyPayroll (uses this file's prisma only).
 */
async function getOrCreateMonthlyPayroll(employeeId: string, month: Date, restaurantId: string) {
  const monthStart = startOfMonth(month)
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { currentSalary: true },
  })
  if (!employee) throw new Error('Employee not found for payroll')
  return prisma.monthlyPayroll.upsert({
    where: { employeeId_month: { employeeId, month: monthStart } },
    create: {
      employeeId,
      month: monthStart,
      baseSalary: employee.currentSalary,
      restaurantId,
    },
    update: {},
  })
}

const APRIL_2026 = { year: 2026, month: 3 as const } // 0-based month index: April
const SEED_APRIL_ADVANCE_NOTE = 'Seed: April 2026 cash advance'

function utcNoonApr2026(day: number): Date {
  return new Date(Date.UTC(APRIL_2026.year, APRIL_2026.month, day, 12, 0, 0))
}

function utcDayRange2026Apr(day: number): { from: Date; to: Date } {
  return {
    from: new Date(Date.UTC(APRIL_2026.year, APRIL_2026.month, day, 0, 0, 0)),
    to: new Date(Date.UTC(APRIL_2026.year, APRIL_2026.month, day, 23, 59, 59, 999)),
  }
}

/**
 * User-provided list (PKR, day of April 2026). Employee names must match DB `employees.name` (exact).
 * Creates advances only; does not go through the API (so inactive employees are allowed, e.g. Bilawal).
 */
async function seedApril2026Advances(restaurantId: string, createdById: string) {
  const rows: { name: string; amount: number; day: number }[] = [
    { name: 'Sanwal', amount: 3000, day: 18 },
    { name: 'Bilawal', amount: 5000, day: 9 },
    { name: 'Bilawal', amount: 2000, day: 19 },
    { name: 'Ubaid', amount: 5000, day: 18 },
    { name: 'Ehtesham', amount: 5000, day: 16 },
    { name: 'Yusuf', amount: 1000, day: 21 },
    { name: 'Umair', amount: 10000, day: 21 },
    { name: 'Yaseen', amount: 1500, day: 23 },
    { name: 'Kamran', amount: 1000, day: 24 },
    { name: 'Ubaid', amount: 1000, day: 24 },
  ]

  for (const row of rows) {
    const employee = await prisma.employee.findFirst({
      where: { restaurantId, name: row.name },
    })
    if (!employee) {
      console.log(`  April advances: skip (no employee "${row.name}")`)
      continue
    }

    const date = utcNoonApr2026(row.day)
    const { from, to } = utcDayRange2026Apr(row.day)
    const exists = await prisma.advance.findFirst({
      where: {
        restaurantId,
        employeeId: employee.id,
        amount: row.amount,
        date: { gte: from, lte: to },
      },
    })
    if (exists) continue

    const payroll = await getOrCreateMonthlyPayroll(employee.id, date, restaurantId)
    await prisma.advance.create({
      data: {
        employeeId: employee.id,
        monthlyPayrollId: payroll.id,
        amount: row.amount,
        type: 'CASH',
        date,
        notes: SEED_APRIL_ADVANCE_NOTE,
        createdById,
        restaurantId,
      },
    })
    console.log(`  April 2026 advance: ${row.name} PKR ${row.amount} (${row.day} Apr)`)
  }
}

// Declare at module scope so seedEmployee can reference it
let restaurant: { id: string; name: string; slug: string; logoUrl: string | null; phone: string | null; address: string | null }

async function main() {
  console.log('Seeding Cafe Mantra...\n')

  // ─── Restaurant ────────────────────────────────────────────────────────────
  restaurant = await prisma.restaurant.upsert({
    where: { slug: 'cafe-mantra' },
    create: {
      name: 'Cafe Mantra',
      slug: 'cafe-mantra',
      phone: '+92 300 0000000',
      address: 'Update this address in Settings → Organization',
      logoUrl: null,
    },
    update: { name: 'Cafe Mantra' },
  })
  console.log('Restaurant:', restaurant.name)

  // ─── Employee Types ────────────────────────────────────────────────────────
  const [typeStaff, typeGuard, typeDishwasher, typeDesigner, typeWeekly] =
    await Promise.all([
      prisma.employeeType.upsert({
        where: { name_restaurantId: { name: 'Staff', restaurantId: restaurant.id } },
        create: { name: 'Staff', restaurantId: restaurant.id, isDailyRate: true, isLeaveEligible: true, isDepositEligible: true },
        update: {},
      }),
      prisma.employeeType.upsert({
        where: { name_restaurantId: { name: 'Guard', restaurantId: restaurant.id } },
        create: { name: 'Guard', restaurantId: restaurant.id, isDailyRate: true, isLeaveEligible: true, isDepositEligible: true },
        update: {},
      }),
      prisma.employeeType.upsert({
        where: { name_restaurantId: { name: 'Dishwasher', restaurantId: restaurant.id } },
        create: { name: 'Dishwasher', restaurantId: restaurant.id, isDailyRate: true, isLeaveEligible: true, isDepositEligible: true },
        update: {},
      }),
      prisma.employeeType.upsert({
        where: { name_restaurantId: { name: 'Designer', restaurantId: restaurant.id } },
        create: { name: 'Designer', restaurantId: restaurant.id, isDailyRate: true, isLeaveEligible: true, isDepositEligible: true, isHiddenFromManager: true },
        update: {},
      }),
      prisma.employeeType.upsert({
        where: { name_restaurantId: { name: 'Weekly Paid', restaurantId: restaurant.id } },
        create: { name: 'Weekly Paid', restaurantId: restaurant.id, isDailyRate: true, isLeaveEligible: false, isDepositEligible: false, hasBillingCycle: true },
        update: {},
      }),
    ])

  // ─── Job Roles ─────────────────────────────────────────────────────────────
  const [roleWaiter, roleHelper, roleCashier, roleManager] = await Promise.all([
    prisma.jobRole.upsert({
      where: { name_restaurantId: { name: 'Waiter', restaurantId: restaurant.id } },
      create: { name: 'Waiter', restaurantId: restaurant.id },
      update: {},
    }),
    prisma.jobRole.upsert({
      where: { name_restaurantId: { name: 'Helper', restaurantId: restaurant.id } },
      create: { name: 'Helper', restaurantId: restaurant.id },
      update: {},
    }),
    prisma.jobRole.upsert({
      where: { name_restaurantId: { name: 'Cashier', restaurantId: restaurant.id } },
      create: { name: 'Cashier', restaurantId: restaurant.id },
      update: {},
    }),
    prisma.jobRole.upsert({
      where: { name_restaurantId: { name: 'Manager', restaurantId: restaurant.id } },
      create: { name: 'Manager', restaurantId: restaurant.id },
      update: {},
    }),
  ])

  // Counters — user said they'll add via UI, just seed defaults
  await Promise.all([
    prisma.counter.upsert({
      where: { name_restaurantId: { name: 'Main Counter', restaurantId: restaurant.id } },
      create: { name: 'Main Counter', restaurantId: restaurant.id },
      update: {},
    }),
  ])

  await initCodeCounter()

  console.log('\n── Active employees (Mar 2026) ──')

  await seedEmployee({
    name: 'Security Company', employeeTypeId: typeGuard.id,
    joinedAt: d(2025, 1, 1), currentSalary: 10000,
    notes: 'External security company — flat 10000/month',
    salaryHistory: [{ amount: 10000, effectiveFrom: d(2025, 1, 1) }],
  })

  await seedEmployee({
    name: 'Ameer', employeeTypeId: typeGuard.id,
    joinedAt: d(2026, 2, 1), currentSalary: 20000,
    notes: 'Guard',
    salaryHistory: [{ amount: 20000, effectiveFrom: d(2026, 2, 1) }],
  })

  await seedEmployee({
    name: 'Huzaifa', employeeTypeId: typeDesigner.id,
    joinedAt: d(2025, 7, 18), currentSalary: 17000,
    notes: 'Designer/IT',
    salaryHistory: [{ amount: 18000, effectiveFrom: d(2025, 7, 18) }, { amount: 17000, effectiveFrom: d(2025, 10, 1) }],
  })

  await seedEmployee({
    name: 'Ubaid', employeeTypeId: typeDishwasher.id,
    joinedAt: d(2026, 1, 20), currentSalary: 33000,
    salaryHistory: [{ amount: 33000, effectiveFrom: d(2026, 1, 20) }],
  })

  await seedEmployee({
    name: 'Aaliyan', employeeTypeId: typeStaff.id, jobRoleId: roleWaiter.id,
    joinedAt: d(2025, 7, 15), currentSalary: 55000,
    salaryHistory: [{ amount: 50000, effectiveFrom: d(2025, 7, 15) }, { amount: 55000, effectiveFrom: d(2026, 3, 1) }],
  })

  await seedEmployee({
    name: 'Umair', employeeTypeId: typeStaff.id, jobRoleId: roleWaiter.id,
    joinedAt: d(2025, 10, 14), currentSalary: 27500,
    salaryHistory: [{ amount: 25000, effectiveFrom: d(2025, 10, 14) }, { amount: 27500, effectiveFrom: d(2026, 3, 1) }],
  })

  await seedEmployee({
    name: 'Irshad', employeeTypeId: typeStaff.id, jobRoleId: roleHelper.id,
    joinedAt: d(2025, 10, 14), currentSalary: 22000,
    salaryHistory: [{ amount: 22000, effectiveFrom: d(2025, 10, 14) }],
  })

  await seedEmployee({
    name: 'Ehtesham', employeeTypeId: typeStaff.id, jobRoleId: roleWaiter.id,
    joinedAt: d(2025, 8, 11), currentSalary: 30000,
    salaryHistory: [
      { amount: 25500, effectiveFrom: d(2025, 8, 11) },
      { amount: 28000, effectiveFrom: d(2025, 10, 1) },
      { amount: 30000, effectiveFrom: d(2025, 11, 1) },
    ],
  })

  await seedEmployee({
    name: 'Sanwal', employeeTypeId: typeStaff.id, jobRoleId: roleHelper.id,
    joinedAt: d(2025, 11, 5), currentSalary: 27500,
    salaryHistory: [{ amount: 25000, effectiveFrom: d(2025, 11, 5) }, { amount: 27500, effectiveFrom: d(2026, 3, 1) }],
  })

  await seedEmployee({
    name: 'Hanif', employeeTypeId: typeStaff.id, jobRoleId: roleManager.id,
    joinedAt: d(2026, 3, 2), currentSalary: 60000,
    salaryHistory: [{ amount: 60000, effectiveFrom: d(2026, 3, 2) }],
  })

  await seedEmployee({
    name: 'Kamran', employeeTypeId: typeDishwasher.id,
    joinedAt: d(2026, 3, 31), currentSalary: 18000,
    salaryHistory: [{ amount: 18000, effectiveFrom: d(2026, 3, 31) }],
  })

  await seedEmployee({
    name: 'Yaseen',
    employeeTypeId: typeDishwasher.id,
    joinedAt: d(2026, 3, 20), currentSalary: 20000,
    salaryHistory: [{ amount: 20000, effectiveFrom: d(2026, 3, 20) }],
    notes: 'Dishwasher',
  })

  console.log('\n── Historical / inactive employees ──')

  // Core team Jan 2025
  await seedEmployee({
    name: 'Arif', employeeTypeId: typeStaff.id, jobRoleId: roleManager.id,
    joinedAt: d(2025, 1, 1), leftAt: d(2025, 7, 15), currentSalary: 40000,
    salaryHistory: [{ amount: 37200, effectiveFrom: d(2025, 1, 1) }, { amount: 40000, effectiveFrom: d(2025, 4, 1) }],
  })

  await seedEmployee({
    name: 'Raja', employeeTypeId: typeStaff.id, jobRoleId: roleManager.id,
    joinedAt: d(2025, 1, 1), leftAt: d(2025, 7, 15), currentSalary: 46500,
    salaryHistory: [{ amount: 37200, effectiveFrom: d(2025, 1, 1) }, { amount: 46500, effectiveFrom: d(2025, 3, 1) }],
  })

  await seedEmployee({
    name: 'Waqas', employeeTypeId: typeStaff.id, jobRoleId: roleWaiter.id,
    joinedAt: d(2025, 1, 1), leftAt: d(2025, 8, 31), currentSalary: 38000,
    salaryHistory: [{ amount: 35000, effectiveFrom: d(2025, 1, 1) }, { amount: 38000, effectiveFrom: d(2025, 5, 1) }],
  })

  await seedEmployee({
    name: 'Hafeez', employeeTypeId: typeStaff.id, jobRoleId: roleWaiter.id,
    joinedAt: d(2025, 1, 8), leftAt: d(2025, 6, 30), currentSalary: 24000,
    notes: '800/day rate',
    salaryHistory: [{ amount: 24000, effectiveFrom: d(2025, 1, 8) }],
  })

  await seedEmployee({
    name: 'Zohaib', employeeTypeId: typeGuard.id,
    joinedAt: d(2025, 1, 1), leftAt: d(2025, 4, 30), currentSalary: 10000,
    notes: 'Guard, replaced by Yusuf',
    salaryHistory: [{ amount: 10000, effectiveFrom: d(2025, 1, 1) }],
  })

  await seedEmployee({
    name: 'Hassan', employeeTypeId: typeWeekly.id,
    joinedAt: d(2025, 1, 1), leftAt: d(2025, 7, 31), currentSalary: 25000,
    billingCycleDay: 7,
    notes: 'Weekly pay at ~1900/week',
    salaryHistory: [{ amount: 25000, effectiveFrom: d(2025, 1, 1) }],
  })

  await seedEmployee({
    name: 'Shahzaib', employeeTypeId: typeStaff.id,
    joinedAt: d(2025, 1, 27), leftAt: d(2025, 2, 28), currentSalary: 25000,
    salaryHistory: [{ amount: 25000, effectiveFrom: d(2025, 1, 27) }],
  })

  await seedEmployee({
    name: 'Kashif', employeeTypeId: typeStaff.id, jobRoleId: roleWaiter.id,
    joinedAt: d(2025, 2, 15), leftAt: d(2025, 10, 31), currentSalary: 25000,
    salaryHistory: [{ amount: 22500, effectiveFrom: d(2025, 2, 15) }, { amount: 25000, effectiveFrom: d(2025, 7, 1) }],
  })

  await seedEmployee({
    name: 'Mujeeb', employeeTypeId: typeStaff.id,
    joinedAt: d(2025, 4, 20), leftAt: d(2025, 7, 15), currentSalary: 24000,
    salaryHistory: [{ amount: 24000, effectiveFrom: d(2025, 4, 20) }],
  })

  await seedEmployee({
    name: 'Bilawal', employeeTypeId: typeStaff.id, jobRoleId: roleWaiter.id,
    joinedAt: d(2025, 3, 19), leftAt: d(2026, 3, 31), currentSalary: 55000,
    notes: 'Gap Apr–Jul 2025, rejoined Jul 18; removed from Mar 2026 roster',
    salaryHistory: [{ amount: 50000, effectiveFrom: d(2025, 3, 19) }, { amount: 55000, effectiveFrom: d(2026, 3, 1) }],
  })

  await seedEmployee({
    name: 'Yusuf', employeeTypeId: typeGuard.id,
    joinedAt: d(2025, 5, 1), leftAt: d(2026, 1, 31), currentSalary: 30000,
    notes: 'Guard May 2025–Jan 2026',
    salaryHistory: [{ amount: 30000, effectiveFrom: d(2025, 5, 1) }],
  })

  await seedEmployee({
    name: 'Husnain', employeeTypeId: typeWeekly.id,
    joinedAt: d(2025, 7, 1), leftAt: d(2025, 8, 31), currentSalary: 25000,
    billingCycleDay: 7,
    salaryHistory: [{ amount: 25000, effectiveFrom: d(2025, 7, 1) }],
  })

  await seedEmployee({
    name: 'Mudassir', employeeTypeId: typeStaff.id,
    joinedAt: d(2025, 7, 7), leftAt: d(2025, 7, 31), currentSalary: 30000,
    salaryHistory: [{ amount: 30000, effectiveFrom: d(2025, 7, 7) }],
  })

  await seedEmployee({
    name: 'Nazeer', employeeTypeId: typeStaff.id,
    joinedAt: d(2025, 7, 24), leftAt: d(2025, 11, 30), currentSalary: 27000,
    salaryHistory: [{ amount: 27000, effectiveFrom: d(2025, 7, 24) }],
  })

  await seedEmployee({
    name: 'Anees', employeeTypeId: typeStaff.id,
    joinedAt: d(2025, 7, 4), leftAt: d(2025, 12, 31), currentSalary: 25500,
    salaryHistory: [{ amount: 25500, effectiveFrom: d(2025, 7, 4) }],
  })

  await seedEmployee({
    name: 'Hamza Ahmed', employeeTypeId: typeDishwasher.id,
    joinedAt: d(2025, 7, 20), leftAt: d(2025, 8, 14), currentSalary: 18000,
    notes: 'First Hamza — left mid-August',
    salaryHistory: [{ amount: 18000, effectiveFrom: d(2025, 7, 20) }],
  })

  await seedEmployee({
    name: 'Hamza Khan', employeeTypeId: typeDishwasher.id,
    joinedAt: d(2025, 12, 7), leftAt: d(2026, 3, 31), currentSalary: 18000,
    notes: 'Second Hamza — joined December',
    salaryHistory: [{ amount: 18000, effectiveFrom: d(2025, 12, 7) }],
  })

  await seedEmployee({
    name: 'M. Ali (Paratha)', employeeTypeId: typeStaff.id,
    joinedAt: d(2025, 7, 29), leftAt: d(2025, 10, 16), currentSalary: 45000,
    notes: '1500/day rate (45000/month)',
    salaryHistory: [{ amount: 45000, effectiveFrom: d(2025, 7, 29) }],
  })

  await seedEmployee({
    name: 'Ahmed (Paratha)', employeeTypeId: typeStaff.id,
    joinedAt: d(2025, 10, 13), leftAt: d(2025, 10, 16), currentSalary: 36000,
    notes: '3-day tenure; 36000/month salary',
    salaryHistory: [{ amount: 36000, effectiveFrom: d(2025, 10, 13) }],
  })

  await seedEmployee({
    name: 'Sheharyar', employeeTypeId: typeDishwasher.id,
    joinedAt: d(2025, 8, 17), leftAt: d(2025, 8, 30), currentSalary: 18000,
    salaryHistory: [{ amount: 18000, effectiveFrom: d(2025, 8, 17) }],
  })

  await seedEmployee({
    name: 'Arif (Dishwasher)', employeeTypeId: typeDishwasher.id,
    joinedAt: d(2025, 8, 18), leftAt: d(2025, 10, 31), currentSalary: 18000,
    salaryHistory: [{ amount: 18000, effectiveFrom: d(2025, 8, 18) }],
  })

  await seedEmployee({
    name: 'Abdul Nabi', employeeTypeId: typeDishwasher.id,
    joinedAt: d(2025, 9, 18), leftAt: d(2026, 1, 31), currentSalary: 18000,
    salaryHistory: [{ amount: 18000, effectiveFrom: d(2025, 9, 18) }],
  })

  await seedEmployee({
    name: 'Sabir', employeeTypeId: typeDishwasher.id,
    joinedAt: d(2025, 10, 31), leftAt: d(2025, 11, 30), currentSalary: 18000,
    salaryHistory: [{ amount: 18000, effectiveFrom: d(2025, 10, 31) }],
  })

  await seedEmployee({
    name: 'Rizwan', employeeTypeId: typeDishwasher.id,
    joinedAt: d(2025, 10, 13), leftAt: d(2025, 11, 30), currentSalary: 18000,
    salaryHistory: [{ amount: 18000, effectiveFrom: d(2025, 10, 13) }],
  })

  await seedEmployee({
    name: 'Sher Muhammad', employeeTypeId: typeStaff.id,
    joinedAt: d(2025, 11, 28), leftAt: d(2026, 3, 15), currentSalary: 30000,
    salaryHistory: [{ amount: 30000, effectiveFrom: d(2025, 11, 28) }],
  })

  await seedEmployee({
    name: 'Fatima', employeeTypeId: typeStaff.id, jobRoleId: roleCashier.id,
    joinedAt: d(2026, 2, 4), leftAt: d(2026, 3, 31), currentSalary: 22000,
    notes: 'Removed from Mar 2026 roster',
    salaryHistory: [{ amount: 22000, effectiveFrom: d(2026, 2, 4) }],
  })

  await seedEmployee({
    name: 'Sajid', employeeTypeId: typeStaff.id,
    joinedAt: d(2026, 3, 12), leftAt: d(2026, 3, 31), currentSalary: 17000,
    notes: 'Short tenure, removed from Mar 2026 roster',
    salaryHistory: [{ amount: 17000, effectiveFrom: d(2026, 3, 12) }],
  })

  await seedEmployee({
    name: 'Rana', employeeTypeId: typeStaff.id,
    joinedAt: d(2026, 2, 20), leftAt: d(2026, 3, 31), currentSalary: 20000,
    notes: 'Removed from Mar 2026 roster',
    salaryHistory: [{ amount: 20000, effectiveFrom: d(2026, 2, 20) }],
  })

  const appUser = await prisma.user.findFirst({
    where: { restaurantId: restaurant.id },
    orderBy: { createdAt: 'asc' },
  })
  if (appUser) {
    console.log('\n── April 2026 advances (cash) ──')
    await seedApril2026Advances(restaurant.id, appUser.id)
  } else {
    console.log(
      '\nApril 2026 advances: skipped (no app user — complete /[restaurant]/setup, then re-run `npm run seed` to insert).'
    )
  }

  console.log('\nDone! Cafe Mantra seed complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
