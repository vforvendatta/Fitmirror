import { db } from '@/lib/db';
import type { UsageDTO } from '@/lib/types';

const FREE_PLAN_DAILY_LIMIT = 3;

/** Returns today's UTC date as `YYYY-MM-DD`. */
export function todayUTC(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Returns today's usage for the given session (free plan = 3/day). */
export async function getTodayUsage(sessionId: string): Promise<UsageDTO> {
  const date = todayUTC();
  const row = await db.usageLog.findUnique({
    where: { sessionId_date: { sessionId, date } },
  });
  const used = row?.count ?? 0;
  return {
    used,
    limit: FREE_PLAN_DAILY_LIMIT,
    remaining: Math.max(0, FREE_PLAN_DAILY_LIMIT - used),
    plan: 'free',
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
