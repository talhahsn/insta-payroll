import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  pgPool: Pool | undefined
}

/**
 * Serverless-friendly Prisma + pg pool.
 * - Reuse pool/client across warm Vercel invocations (always pin on globalThis).
 * - Keep max connections low (Supabase pooler + many lambdas).
 * Pair with Vercel region near the DB (see vercel.json → sin1 for ap-southeast-1).
 */
function createPrismaClient() {
  const pool =
    globalForPrisma.pgPool ??
    new Pool({
      connectionString: process.env['DATABASE_URL']!,
      // One connection per isolate — many concurrent lambdas share the pooler.
      max: 1,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
      ssl:
        process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: true }
          : { rejectUnauthorized: false },
    })

  globalForPrisma.pgPool = pool

  const adapter = new PrismaPg(pool)
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

globalForPrisma.prisma = prisma
