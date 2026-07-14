import { PrismaClient } from '@prisma/client'
import { pbDb } from './pb-db'

/**
 * Backend selector.
 *
 * BACKEND=prisma (default)      → Prisma + SQLite (zero external deps)
 * BACKEND=pocketbase            → PocketBase REST adapter (see src/lib/pb-db.ts)
 *
 * All app routes/lib files import { db } from '@/lib/db', so flipping the
 * backend is a single env var — no code changes needed elsewhere.
 */
const BACKEND = (process.env.BACKEND || 'prisma').toLowerCase()
export const BACKEND_MODE: 'prisma' | 'pocketbase' =
  BACKEND === 'pocketbase' ? 'pocketbase' : 'prisma'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV !== 'production' ? ['query'] : [],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// `any` keeps both backends usable from call sites without TS union friction;
// the app uses a small, stable subset of Prisma's API that pb-db mirrors.
export const db: any = BACKEND_MODE === 'pocketbase' ? pbDb : prisma
