import { db } from '@/lib/db';
import type { UsageDTO } from '@/lib/types';

const PLAN_DAILY_LIMITS: Record<string, number> = {
  free: 3,
  pro: 50,
  premium: 100_000, // effectively unlimited
};

const DEFAULT_LIMIT = PLAN_DAILY_LIMITS.free;

/** Returns today's UTC date as `YYYY-MM-DD`. */
export function todayUTC(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns today's usage for the given session, plan-aware.
 * Reads Session.plan from DB to choose the daily limit
 * (free=3, pro=50, premium=effectively unlimited).
 */
export async function getTodayUsage(sessionId: string): Promise<UsageDTO> {
  const date = todayUTC();

  const [row, session] = await Promise.all([
    db.usageLog.findUnique({
      where: { sessionId_date: { sessionId, date } },
    }),
    db.session.findUnique({
      where: { id: sessionId },
      select: { plan: true },
    }),
  ]);

  const plan = (session?.plan ?? 'free') as UsageDTO['plan'];
  const limit = PLAN_DAILY_LIMITS[plan] ?? DEFAULT_LIMIT;
  const used = row?.count ?? 0;

  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
    plan,
  };
}

/** Upserts today's UsageLog, incrementing count by 1. */
export async function incrementUsage(sessionId: string): Promise<void> {
  const date = todayUTC();
  await db.usageLog.upsert({
    where: { sessionId_date: { sessionId, date } },
    create: { sessionId, date, count: 1 },
    update: { count: { increment: 1 } },
  });
}
