import { NextResponse } from 'next/server';
import { retrievePayment } from '@/lib/dodo';

/**
 * GET /api/checkout/status?paymentId=xxx — polls Dodo for the current status
 * of a payment. Useful after the user is redirected back from the hosted
 * checkout page (`/?checkout=success`).
 *
 * Returns `{ status, plan, amountCents }` (200) on success.
 * Returns 400 when `paymentId` is missing.
 * Returns 503 when Dodo is not configured.
 * Returns 502 on upstream Dodo errors.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const paymentId = url.searchParams.get('paymentId') ?? '';
  if (!paymentId) {
    return NextResponse.json(
      { error: 'paymentId query param required' },
      { status: 400 },
    );
  }

  try {
    const result = await retrievePayment(paymentId);
    const metadata = (result.metadata ?? {}) as { plan?: unknown };
    const plan =
      typeof metadata.plan === 'string' ? metadata.plan : null;
    return NextResponse.json(
      {
        status: result.status,
        plan,
        amountCents: result.amount,
        currency: result.currency,
      },
      { status: 200 },
    );
  } catch (err) {
    const msg = (err as Error).message || 'Unknown error';
    console.error('[/api/checkout/status] retrievePayment failed:', msg);
    if (msg.includes('not configured')) {
      return NextResponse.json({ error: msg }, { status: 503 });
    }
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
