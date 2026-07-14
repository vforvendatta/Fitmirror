import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isAdmin } from '@/lib/admin';

/**
 * GET /api/admin/users?limit=100 — list all sessions newest-first with their
 * total succeeded-payment revenue (in cents) and tryOn count.
 */
export async function GET(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const limitRaw = Number.parseInt(url.searchParams.get('limit') ?? '100', 10);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 500) : 100;

  const sessions = await db.session.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      plan: true,
      createdAt: true,
      lastActive: true,
      tryOns: { select: { id: true } },
      payments: {
        where: { status: 'succeeded' },
        select: { amountCents: true },
      },
    },
  });

  const users = sessions.map((s) => {
    let paymentCountCents = 0;
    for (const p of s.payments) paymentCountCents += p.amountCents;
    return {
      id: s.id,
      plan: s.plan,
      createdAt: s.createdAt.toISOString(),
      lastActive: s.lastActive.toISOString(),
      tryOnCount: s.tryOns.length,
      paymentCountCents,
    };
  });

  return NextResponse.json(users);
}
