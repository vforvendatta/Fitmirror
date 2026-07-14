import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isAdmin } from '@/lib/admin';
import { todayUTC } from '@/lib/usage';

/** GET /api/admin/analytics — aggregated dashboard stats (protected). */
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ---- Date bucketing for the last 14 days (UTC, oldest first) ----
  const days: string[] = [];
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate() - i,
    ));
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    days.push(`${y}-${m}-${day}`);
  }

  // ---- Fetch everything we need in parallel ----
  const [
    totalUsers,
    totalTryOns,
    todayTryOns,
    allTryOnsForBuckets,
    sessionsForPlans,
    payments,
    recentSessions,
    recentPaymentsRaw,
  ] = await Promise.all([
    db.session.count(),
    db.tryOn.count(),
    db.tryOn.count({
      where: { createdAt: { gte: new Date(`${todayUTC()}T00:00:00.000Z`) } },
    }),
    // createdAt + garmentName for buckets and top-garments
    db.tryOn.findMany({
      select: { createdAt: true, garmentName: true, sessionId: true },
    }),
    db.session.findMany({ select: { id: true, plan: true } }),
    db.payment.findMany({
      where: { status: 'succeeded' },
      select: { amountCents: true },
    }),
    db.session.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        plan: true,
        createdAt: true,
        lastActive: true,
        tryOns: { select: { id: true } },
      },
    }),
    db.payment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        sessionId: true,
        amountCents: true,
        plan: true,
        createdAt: true,
      },
    }),
  ]);

  // ---- tryOnsByDay ----
  const countsByDate = new Map<string, number>();
  for (const d of days) countsByDate.set(d, 0);
  for (const t of allTryOnsForBuckets) {
    const y = t.createdAt.getUTCFullYear();
    const m = String(t.createdAt.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(t.createdAt.getUTCDate()).padStart(2, '0');
    const key = `${y}-${m}-${dd}`;
    if (countsByDate.has(key)) {
      countsByDate.set(key, (countsByDate.get(key) ?? 0) + 1);
    }
  }
  const tryOnsByDay = days.map((date) => ({
    date,
    count: countsByDate.get(date) ?? 0,
  }));

  // ---- planDistribution ----
  const planDistribution = { free: 0, pro: 0, premium: 0 };
  for (const s of sessionsForPlans) {
    if (s.plan === 'pro') planDistribution.pro += 1;
    else if (s.plan === 'premium') planDistribution.premium += 1;
    else planDistribution.free += 1;
  }

  // ---- topGarments (non-null garmentName) ----
  const garmentCounts = new Map<string, number>();
  for (const t of allTryOnsForBuckets) {
    if (!t.garmentName) continue;
    garmentCounts.set(t.garmentName, (garmentCounts.get(t.garmentName) ?? 0) + 1);
  }
  const topGarments = Array.from(garmentCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // ---- revenueCents ----
  let revenueCents = 0;
  for (const p of payments) revenueCents += p.amountCents;

  // ---- recentUsers ----
  const recentUsers = recentSessions.map((s) => ({
    id: s.id,
    plan: s.plan,
    createdAt: s.createdAt.toISOString(),
    lastActive: s.lastActive.toISOString(),
    tryOnCount: s.tryOns.length,
  }));

  // ---- recentPayments ----
  const recentPayments = recentPaymentsRaw.map((p) => ({
    id: p.id,
    sessionId: p.sessionId,
    amountCents: p.amountCents,
    plan: p.plan,
    createdAt: p.createdAt.toISOString(),
  }));

  return NextResponse.json({
    totalUsers,
    totalTryOns,
    todayTryOns,
    tryOnsByDay,
    planDistribution,
    topGarments,
    revenueCents,
    recentUsers,
    recentPayments,
  });
}
