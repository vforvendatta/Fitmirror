import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { createCheckout } from '@/lib/dodo';

const VALID_PLANS = new Set(['pro', 'premium']);

/**
 * POST /api/checkout — start a Dodo Payments hosted checkout for a plan
 * upgrade. Body: `{ plan: 'pro'|'premium', customerEmail?: string }`.
 *
 * Returns `{ checkoutUrl, paymentId }` (200) on success.
 * Returns 400 when `plan` is missing/invalid.
 * Returns 503 when Dodo is not configured (no API key or disabled).
 */
export async function POST(req: Request) {
  let body: { plan?: unknown; customerEmail?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const plan = typeof body.plan === 'string' ? body.plan : '';
  if (!VALID_PLANS.has(plan)) {
    return NextResponse.json(
      { error: 'plan must be one of pro | premium' },
      { status: 400 },
    );
  }

  const customerEmail =
    typeof body.customerEmail === 'string' && body.customerEmail.includes('@')
      ? body.customerEmail.trim()
      : undefined;

  // Resolve the anonymous browser session (sets cookie if missing).
  let sessionId: string;
  try {
    const s = await getSession();
    sessionId = s.id;
  } catch (err) {
    console.error('[/api/checkout] getSession failed:', err);
    return NextResponse.json(
      { error: 'Failed to resolve session' },
      { status: 500 },
    );
  }

  // Build the return URL from the request origin so it works behind the Caddy
  // gateway. We strip the XTransformPort query param to keep it clean.
  let origin: string;
  try {
    const url = new URL(req.url);
    origin = `${url.protocol}//${url.host}`;
  } catch {
    origin = 'http://localhost:3000';
  }
  const returnUrl = `${origin}/?checkout=success`;

  try {
    const { paymentId, checkoutUrl } = await createCheckout({
      sessionId,
      plan: plan as 'pro' | 'premium',
      customerEmail,
      returnUrl,
    });
    return NextResponse.json({ checkoutUrl, paymentId }, { status: 200 });
  } catch (err) {
    const msg = (err as Error).message || 'Unknown error';
    console.error('[/api/checkout] createCheckout failed:', msg);
    // 503 maps cleanly to "Dodo payments not configured" per the contract.
    if (msg.includes('not configured')) {
      return NextResponse.json({ error: msg }, { status: 503 });
    }
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
