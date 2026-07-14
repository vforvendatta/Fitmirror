import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getDodoSetting, verifyWebhook } from '@/lib/dodo';

const VALID_PLANS = new Set(['pro', 'premium']);

/**
 * POST /api/webhook/dodo — receives Dodo Payments webhook events.
 *
 * Verifies the `dp_signature` HMAC-SHA256 header against the raw body using
 * `dodo.webhook_secret` (DB → env fallback). When no secret is configured we
 * accept the payload but log a warning (per task spec).
 *
 * On `status === 'succeeded'` with a `metadata.sessionId`:
 *   - Creates a Payment row (provider='dodo', providerPaymentId=payment_id),
 *     idempotent on (provider, providerPaymentId).
 *   - Upgrades the Session.plan to the purchased plan.
 *
 * Always returns 200 `{ received: true }` so Dodo does not retry.
 */
export async function POST(req: Request) {
  // Read the raw body first — needed for HMAC verification.
  const rawBody = await req.text();
  const signature =
    req.headers.get('dp_signature') ?? req.headers.get('DP_Signature') ?? null;

  const secret = await getDodoSetting('dodo.webhook_secret');

  let verified = false;
  if (!secret) {
    console.warn(
      '[/api/webhook/dodo] no dodo.webhook_secret configured — accepting unverified payload',
    );
  } else {
    verified = verifyWebhook(rawBody, signature, secret);
    if (!verified) {
      console.warn(
        '[/api/webhook/dodo] signature verification failed — accepting anyway (200) but ignoring payload',
      );
      // Per spec: "If verification is complex, accept the payload but log a
      // warning; the route must still work." We accept but do NOT process to
      // avoid spoofed upgrades. Still 200 so Dodo stops retrying.
      return NextResponse.json({ received: true, verified: false }, { status: 200 });
    }
  }

  // Parse the JSON body.
  let payload: Record<string, unknown> = {};
  try {
    payload = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : {};
  } catch (err) {
    console.error('[/api/webhook/dodo] invalid JSON body:', err);
    // 200 so Dodo doesn't retry malformed payloads forever.
    return NextResponse.json(
      { received: true, error: 'invalid JSON' },
      { status: 200 },
    );
  }

  const paymentId =
    typeof payload.payment_id === 'string'
      ? payload.payment_id
      : typeof (payload as { id?: unknown }).id === 'string'
        ? ((payload as { id: string }).id)
        : '';
  const status =
    typeof payload.status === 'string' ? payload.status : 'unknown';

  // metadata may be nested under payload.metadata or at top-level.
  const metadataRaw = (payload.metadata ?? {}) as Record<string, unknown>;
  const sessionId =
    typeof metadataRaw.sessionId === 'string'
      ? metadataRaw.sessionId
      : typeof metadataRaw.session_id === 'string'
        ? metadataRaw.session_id
        : '';
  const plan =
    typeof metadataRaw.plan === 'string' ? metadataRaw.plan : '';

  // Amount may be in cents at the top level; some providers nest under `amount`.
  const amountCentsRaw = payload.amount;
  const amountCents =
    typeof amountCentsRaw === 'number' && Number.isFinite(amountCentsRaw)
      ? Math.trunc(amountCentsRaw)
      : null;
  const currency =
    typeof payload.currency === 'string' ? payload.currency.toUpperCase() : 'USD';

  console.info(
    '[/api/webhook/dodo] received',
    JSON.stringify({ paymentId, status, sessionId, plan, amountCents, currency, verified }),
  );

  // If sessionId is missing we can't attribute the payment — accept & exit.
  if (!sessionId) {
    console.warn('[/api/webhook/dodo] no sessionId in metadata — skipping');
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // Only act on succeeded payments.
  if (status !== 'succeeded') {
    return NextResponse.json({ received: true, status }, { status: 200 });
  }

  // Validate plan before persisting.
  if (!VALID_PLANS.has(plan)) {
    console.warn(`[/api/webhook/dodo] invalid plan "${plan}" — skipping`);
    return NextResponse.json({ received: true }, { status: 200 });
  }

  try {
    // Idempotency: if a Payment row already exists for this Dodo payment_id,
    // don't double-create. Use upsert keyed on (provider, providerPaymentId).
    // Prisma can't upsert on a compound unique without a @@unique, so we
    // check-then-create with findFirst.
    const existing = await db.payment.findFirst({
      where: { provider: 'dodo', providerPaymentId: paymentId || undefined },
      select: { id: true },
    });

    if (existing) {
      // Already processed — still ensure the session is on the right plan.
      await db.session
        .update({
          where: { id: sessionId },
          data: { plan },
        })
        .catch((err: unknown) => {
          console.warn(
            `[/api/webhook/dodo] session update skipped (session may be gone):`,
            err,
          );
        });
      return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
    }

    // Verify the session exists before creating a Payment (FK constraint).
    const session = await db.session.findUnique({
      where: { id: sessionId },
      select: { id: true },
    });
    if (!session) {
      console.warn(
        `[/api/webhook/dodo] session ${sessionId} not found — skipping`,
      );
      return NextResponse.json({ received: true }, { status: 200 });
    }

    await db.payment.create({
      data: {
        sessionId,
        amountCents: amountCents ?? 0,
        currency,
        plan,
        status: 'succeeded',
        provider: 'dodo',
        providerPaymentId: paymentId || null,
      },
    });

    await db.session.update({
      where: { id: sessionId },
      data: { plan },
    });

    console.info(
      `[/api/webhook/dodo] OK — session ${sessionId} upgraded to ${plan}`,
    );
    return NextResponse.json({ received: true, verified }, { status: 200 });
  } catch (err) {
    console.error('[/api/webhook/dodo] processing error:', err);
    // Still 200 so Dodo stops retrying — we logged the error.
    return NextResponse.json(
      { received: true, error: 'internal' },
      { status: 200 },
    );
  }
}
