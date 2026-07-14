// FitMirror — Dodo Payments integration (server-side only).
//
// Admin-configurable keys (read from the AdminSetting table, falling back to
// env vars when unset):
//   - dodo.api_key          (merchant secret; begins with `sk_` or `dsk_`)
//   - dodo.webhook_secret   (used to verify `dp_signature` HMAC on webhooks)
//   - dodo.enabled          ('true' | 'false' — master kill switch)
//
// Env fallbacks: DODO_API_KEY, DODO_WEBHOOK_SECRET.

import { createHmac, timingSafeEqual } from 'node:crypto';
import { db } from '@/lib/db';

const DODO_API_BASE = 'https://api.dodopayments.com';

/** Plan → price in cents (USD). */
export const PLAN_PRICES_CENTS: Record<'pro' | 'premium', number> = {
  pro: 999, // $9.99
  premium: 1999, // $19.99
};

const ENV_FALLBACKS: Record<string, string | undefined> = {
  'dodo.api_key': process.env.DODO_API_KEY,
  'dodo.webhook_secret': process.env.DODO_WEBHOOK_SECRET,
  'dodo.enabled': process.env.DODO_ENABLED,
};

/**
 * Reads a single Dodo setting from the AdminSetting table, falling back to the
 * matching environment variable when no DB row exists. Returns null if neither
 * is set.
 */
export async function getDodoSetting(key: string): Promise<string | null> {
  try {
    const row = await db.adminSetting.findUnique({ where: { key } });
    if (row && row.value.trim() !== '') return row.value.trim();
  } catch (err) {
    // DB might be unavailable during cold-start; fall through to env.
    console.warn(`[dodo] failed to read AdminSetting "${key}":`, err);
  }
  const envVal = ENV_FALLBACKS[key];
  return envVal && envVal.trim() !== '' ? envVal.trim() : null;
}

/** True when Dodo is enabled AND an API key is configured. */
async function isDodoConfigured(): Promise<{ enabled: boolean; apiKey: string | null }> {
  const enabledRaw = await getDodoSetting('dodo.enabled');
  const enabled = enabledRaw === null ? true : enabledRaw.toLowerCase() === 'true';
  const apiKey = await getDodoSetting('dodo.api_key');
  return { enabled, apiKey };
}

/**
 * Throws a clear, user-facing Error when Dodo is disabled or unconfigured.
 * Callers should map this to an HTTP 503.
 */
async function requireDodo(): Promise<string> {
  const { enabled, apiKey } = await isDodoConfigured();
  if (!enabled) {
    throw new Error('Dodo payments not configured (dodo.enabled is false)');
  }
  if (!apiKey) {
    throw new Error('Dodo payments not configured (missing dodo.api_key)');
  }
  return apiKey;
}

export interface CreateCheckoutOpts {
  sessionId: string;
  plan: 'pro' | 'premium';
  customerEmail?: string;
  returnUrl: string;
}

export interface CreateCheckoutResult {
  paymentId: string;
  checkoutUrl: string;
}

/**
 * Creates a Dodo checkout payment link for the given plan.
 * Returns the payment id and hosted checkout URL the browser should redirect to.
 */
export async function createCheckout(
  opts: CreateCheckoutOpts,
): Promise<CreateCheckoutResult> {
  const apiKey = await requireDodo();
  const amount = PLAN_PRICES_CENTS[opts.plan];
  if (typeof amount !== 'number') {
    throw new Error(`Invalid plan: ${opts.plan}`);
  }

  const payload: Record<string, unknown> = {
    amount,
    currency: 'USD',
    payment_link: true,
    metadata: {
      sessionId: opts.sessionId,
      plan: opts.plan,
    },
    return_url: opts.returnUrl,
  };
  if (opts.customerEmail && opts.customerEmail.includes('@')) {
    payload.customer_email = opts.customerEmail;
  }

  const res = await fetch(`${DODO_API_BASE}/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Dodo createCheckout failed (${res.status}): ${text.slice(0, 500)}`,
    );
  }

  const data = (await res.json()) as {
    payment_id?: string;
    checkout_url?: string;
    id?: string;
    status?: string;
  };

  const paymentId = data.payment_id ?? data.id ?? '';
  const checkoutUrl = data.checkout_url ?? '';
  if (!paymentId || !checkoutUrl) {
    throw new Error(
      `Dodo createCheckout returned incomplete response: ${JSON.stringify(data).slice(0, 500)}`,
    );
  }

  return { paymentId, checkoutUrl };
}

export interface RetrievePaymentResult {
  status: string; // "succeeded" | "pending" | "failed" | ...
  amount: number | null; // cents
  currency: string | null;
  metadata: Record<string, unknown> | null;
}

/**
 * Retrieves a Dodo payment by id. Used for polling after the user is redirected
 * back from the hosted checkout.
 */
export async function retrievePayment(paymentId: string): Promise<RetrievePaymentResult> {
  const apiKey = await requireDodo();
  const res = await fetch(`${DODO_API_BASE}/payments/${encodeURIComponent(paymentId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Dodo retrievePayment failed (${res.status}): ${text.slice(0, 500)}`,
    );
  }

  const data = (await res.json()) as {
    status?: string;
    amount?: number;
    currency?: string;
    metadata?: Record<string, unknown> | null;
  };

  return {
    status: data.status ?? 'unknown',
    amount: typeof data.amount === 'number' ? data.amount : null,
    currency: typeof data.currency === 'string' ? data.currency : null,
    metadata: data.metadata ?? null,
  };
}

/**
 * Verifies a Dodo webhook signature. Dodo sends an `dp_signature` header whose
 * value is the HMAC-SHA256 of the raw request body, hex-encoded, using the
 * webhook secret as the key.
 *
 * Returns true when the signature matches. Returns false when a secret is
 * configured but the signature is missing or mismatched. Callers should treat
 * a missing secret as "accept but log" per the task spec.
 */
export function verifyWebhook(rawBody: string, signature: string | null, secret: string): boolean {
  if (!secret) return false;
  if (!signature) return false;
  try {
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch (err) {
    console.error('[dodo] verifyWebhook error:', err);
    return false;
  }
}
