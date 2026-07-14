import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isAdmin, setAdminSetting } from '@/lib/admin';

const ADMIN_TOKEN_KEY = 'admin_token';
const ADMIN_PASSWORD_KEY = 'admin_password';
const PASSWORD_MASK = '••••';

const PROVIDER_DEFAULTS: Record<string, string> = {
  'provider.tryon.enabled': 'true',
  'provider.tryon.model': 'zai-vlm-guided',
  'provider.imagegen.enabled': 'true',
  'provider.imagegen.model': 'zai-image',
  'provider.llm.enabled': 'true',
  'provider.llm.model': 'zai-llm',
};

/**
 * GET /api/admin/settings — returns all stored settings, masking the admin
 * password and excluding the admin_token entirely. Injects provider.* defaults
 * for any keys that are not yet stored in the DB (without persisting them).
 */
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rows = await db.adminSetting.findMany();
  const stored: Record<string, string> = {};
  for (const r of rows) {
    if (r.key === ADMIN_TOKEN_KEY) continue; // never expose
    if (r.key === ADMIN_PASSWORD_KEY) {
      stored[r.key] = PASSWORD_MASK;
    } else {
      stored[r.key] = r.value;
    }
  }

  // Merge in provider.* defaults for any not currently stored.
  const settings: Record<string, string> = { ...PROVIDER_DEFAULTS, ...stored };

  // Guarantee admin_password appears (masked) even if never stored.
  if (!(ADMIN_PASSWORD_KEY in settings)) {
    settings[ADMIN_PASSWORD_KEY] = PASSWORD_MASK;
  }

  return NextResponse.json({ settings });
}

/**
 * PUT /api/admin/settings — upserts every key/value. Refuses to overwrite
 * `admin_token`. Skips `admin_password` when value is empty or the mask
 * (so the existing password is preserved).
 */
export async function PUT(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { settings?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const incoming = body.settings;
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
    return NextResponse.json(
      { error: 'settings object required' },
      { status: 400 },
    );
  }

  const entries = Object.entries(incoming as Record<string, unknown>);

  for (const [key, rawValue] of entries) {
    if (key === ADMIN_TOKEN_KEY) continue; // never writable via this route
    if (typeof rawValue !== 'string') continue;
    if (key === ADMIN_PASSWORD_KEY) {
      const trimmed = rawValue.trim();
      if (trimmed === '' || trimmed === PASSWORD_MASK) continue; // keep existing
      await setAdminSetting(key, trimmed);
      continue;
    }
    await setAdminSetting(key, rawValue);
  }

  return NextResponse.json({ ok: true });
}
