/**
 * Compares app payroll math (same as /payroll) to data/cafe-ledger-migration-preview.json grandTotal per month.
 * Run: npx tsx --tsconfig tsconfig.json scripts/verify-cafe-ledger-months.ts
 */
import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { prisma } from '@/lib/prisma'
import { parseMonthFromQuery } from '@/lib/month-query'
import { calculateMonthlyRoster } from '@/services/payroll.service'

const CAFE_SLUG = 'cafe-mantra'

type Preview = {
  by_month: { month: string; grandTotal: number; rows: { name: string }[] }[]
}

async function main() {
  const raw = readFileSync(join(process.cwd(), 'data/cafe-ledger-migration-preview.json'), 'utf8')
  const preview = JSON.parse(raw) as Preview
  const restaurant = await prisma.restaurant.findUnique({ where: { slug: CAFE_SLUG } })
  if (!restaurant) {
    console.error(`Restaurant not found: ${CAFE_SLUG}`)
    process.exit(1)
  }

  const errors: string[] = []
  for (const m of preview.by_month) {
    const month = parseMonthFromQuery(m.month)
    const roster = await calculateMonthlyRoster(month, 'LIVE', restaurant.id, true)
    const sumNet = Math.round(roster.reduce((s, r) => s + r.netPayable, 0))
    const expected = m.grandTotal
    const ok = sumNet === expected
    const mark = ok ? 'OK' : 'MISMATCH'
    console.log(
      `${m.month} ${mark}  UI sum(netPayable)=${sumNet}  preview grandTotal=${expected}  (rows: roster ${roster.length} vs json ${m.rows.length})`
    )
    if (!ok) {
      errors.push(m.month)
    }
  }

  if (errors.length) {
    console.error(`\nMismatches: ${errors.join(', ')}`)
    process.exit(1)
  }
  console.log('\nAll months match preview JSON (same engine as /payroll LIVE).')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
