import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isAdmin } from '@/lib/admin';

/**
 * GET /api/admin/payments?limit=100 — list all payments newest-first.
 */
export async function GET(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const limitRaw = Number.parseInt(url.searchParams.get('limit') ?? '100', 10);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 500) : 100;

  const payments = await db.payment.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      sessionId: true,
      amountCents: true,
      currency: true,
      plan: true,
      status: true,
      createdAt: true,
    },
  });

  const result = payments.map((p) => ({
    id: p.id,
    sessionId: p.sessionId,
    amountCents: p.amountCents,
    currency: p.currency,
    plan: p.plan,
    status: p.status,
    createdAt: p.createdAt.toISOString(),
  }));

  return NextResponse.json(result);
}
