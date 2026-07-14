import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isAdmin } from '@/lib/admin';

const VALID_PLANS = new Set(['free', 'pro', 'premium']);

/** POST /api/admin/upgrade — set a session's plan. Body: { sessionId, plan }. */
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { sessionId?: unknown; plan?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
  const plan = typeof body.plan === 'string' ? body.plan : '';

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
  }
  if (!VALID_PLANS.has(plan)) {
    return NextResponse.json(
      { error: 'plan must be one of free | pro | premium' },
      { status: 400 },
    );
  }

  const existing = await db.session.findUnique({ where: { id: sessionId } });
  if (!existing) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  await db.session.update({
    where: { id: sessionId },
    data: { plan },
  });

  return NextResponse.json({ ok: true });
}
