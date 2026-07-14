import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isAdmin } from '@/lib/admin';

const VALID_PLANS = new Set(['pro', 'premium']);

/**
 * POST /api/admin/payment — record a successful payment for a session and
 * upgrade the session to the purchased plan. Body:
 * { sessionId, amountCents, plan: 'pro'|'premium', currency? }
 */
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    sessionId?: unknown;
    amountCents?: unknown;
    plan?: unknown;
    currency?: unknown;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
  const amountCents =
    typeof body.amountCents === 'number' && Number.isFinite(body.amountCents)
      ? Math.trunc(body.amountCents)
      : null;
  const plan = typeof body.plan === 'string' ? body.plan : '';
  const currency =
    typeof body.currency === 'string' && body.currency.trim()
      ? body.currency.trim()
      : 'USD';

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
  }
  if (amountCents === null || amountCents < 0) {
    return NextResponse.json(
      { error: 'amountCents must be a non-negative number' },
      { status: 400 },
    );
  }
  if (!VALID_PLANS.has(plan)) {
    return NextResponse.json(
      { error: 'plan must be one of pro | premium' },
      { status: 400 },
    );
  }

  const existing = await db.session.findUnique({ where: { id: sessionId } });
  if (!existing) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const payment = await db.payment.create({
    data: {
      sessionId,
      amountCents,
      currency,
      plan,
      status: 'succeeded',
    },
  });

  await db.session.update({
    where: { id: sessionId },
    data: { plan },
  });

  return NextResponse.json({
    ok: true,
    payment: {
      id: payment.id,
      sessionId: payment.sessionId,
      amountCents: payment.amountCents,
      currency: payment.currency,
      plan: payment.plan,
      status: payment.status,
      createdAt: payment.createdAt.toISOString(),
    },
  });
}
