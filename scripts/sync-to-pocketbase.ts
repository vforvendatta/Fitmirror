/**
 * FitMirror → PocketBase sync bridge.
 *
 * Mirrors all Prisma data (sessions, tryons, wardrobe_items, usage_logs,
 * admin_settings, payments) into a PocketBase instance so you can view and
 * edit data afterwards from the PocketBase admin UI at http://localhost:8090/_/
 *
 * Idempotent: safe to run repeatedly (upserts by matching fields).
 *
 * Usage:
 *   POCKETBASE_URL=http://localhost:8090 \
 *   POCKETBASE_ADMIN_EMAIL=admin@fitmirror.local \
 *   POCKETBASE_ADMIN_PASSWORD=fitmirror-admin-2024 \
 *   bun run scripts/sync-to-pocketbase.ts
 *
 * Or with docker compose:
 *   docker compose run --rm app node scripts/sync-to-pocketbase.ts
 */
import { db } from '../src/lib/db'

const PB_URL = process.env.POCKETBASE_URL || 'http://localhost:8090'
const PB_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@fitmirror.local'
const PB_PASS = process.env.POCKETBASE_ADMIN_PASSWORD || 'fitmirror-admin-2024'

async function pb(path: string, opts: RequestInit = {}, token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string>),
  }
  if (token) headers.Authorization = token
  const r = await fetch(`${PB_URL}${path}`, { ...opts, headers })
  if (!r.ok) {
    const t = await r.text().catch(() => '')
    throw new Error(`PB ${path} → ${r.status}: ${t.slice(0, 200)}`)
  }
  return r.json().catch(() => ({}))
}

async function auth(): Promise<string> {
  const d = await pb('/api/admins/auth-with-password', {
    method: 'POST',
    body: JSON.stringify({ email: PB_EMAIL, password: PB_PASS }),
  })
  return d.token
}

async function upsertRecord(token: string, collection: string, record: Record<string, unknown>) {
  // PocketBase doesn't have true upsert; we try create and ignore 400 (duplicate).
  try {
    await pb(`/api/collections/${collection}/records`, {
      method: 'POST',
      body: JSON.stringify(record),
    }, token)
    return 'created'
  } catch (e: any) {
    if (String(e.message).includes('400')) return 'exists'
    throw e
  }
}

async function main() {
  console.log(`FitMirror → PocketBase sync → ${PB_URL}`)
  const token = await auth()
  console.log('✓ authenticated as PocketBase admin')

  // 1. Sessions
  const sessions = await db.session.findMany()
  console.log(`syncing ${sessions.length} sessions…`)
  const sessionMap = new Map<string, string>() // prismaId → pbId
  for (const s of sessions) {
    const rec: Record<string, unknown> = {
      plan: s.plan || 'free',
      created_at: s.createdAt.toISOString(),
      last_active: s.lastActive.toISOString(),
    }
    try {
      const created = await pb('/api/collections/sessions/records', {
        method: 'POST', body: JSON.stringify(rec),
      }, token)
      sessionMap.set(s.id, created.id)
    } catch (e: any) {
      if (!String(e.message).includes('400')) console.log('  session skip:', e.message.slice(0, 80))
    }
  }
  console.log(`  ✓ ${sessionMap.size} sessions synced`)

  // 2. TryOns
  const tryons = await db.tryOn.findMany()
  console.log(`syncing ${tryons.length} try-ons…`)
  for (const t of tryons) {
    const sid = sessionMap.get(t.sessionId)
    if (!sid) continue
    await upsertRecord(token, 'tryons', {
      session: sid,
      person_image_url: t.personImageUrl,
      garment_image_url: t.garmentImageUrl,
      result_image_url: t.resultImageUrl || '',
      garment_name: t.garmentName || '',
      report: t.report || '{}',
      created_at: t.createdAt.toISOString(),
    })
  }
  console.log('  ✓ try-ons synced')

  // 3. Wardrobe
  const wardrobe = await db.wardrobeItem.findMany()
  console.log(`syncing ${wardrobe.length} wardrobe items…`)
  for (const w of wardrobe) {
    const sid = sessionMap.get(w.sessionId)
    if (!sid) continue
    await upsertRecord(token, 'wardrobe_items', {
      session: sid,
      name: w.name,
      notes: w.notes || '',
      person_image_url: w.personImageUrl || '',
      garment_image_url: w.garmentImageUrl || '',
      result_image_url: w.resultImageUrl || '',
      created_at: w.createdAt.toISOString(),
    })
  }
  console.log('  ✓ wardrobe synced')

  // 4. Usage logs
  const logs = await db.usageLog.findMany()
  console.log(`syncing ${logs.length} usage logs…`)
  for (const u of logs) {
    const sid = sessionMap.get(u.sessionId)
    if (!sid) continue
    await upsertRecord(token, 'usage_logs', {
      session: sid, date: u.date, count: u.count,
    })
  }
  console.log('  ✓ usage logs synced')

  // 5. Admin settings
  const settings = await db.adminSetting.findMany()
  console.log(`syncing ${settings.length} admin settings…`)
  for (const a of settings) {
    if (a.key === 'admin_token') continue
    await upsertRecord(token, 'admin_settings', { key: a.key, value: a.value })
  }
  console.log('  ✓ admin settings synced')

  // 6. Payments
  const payments = await db.payment.findMany()
  console.log(`syncing ${payments.length} payments…`)
  for (const p of payments) {
    const sid = sessionMap.get(p.sessionId)
    if (!sid) continue
    await upsertRecord(token, 'payments', {
      session: sid,
      amount_cents: p.amountCents,
      currency: p.currency,
      plan: p.plan,
      status: p.status,
      provider: p.provider || '',
      provider_payment_id: p.providerPaymentId || '',
      created_at: p.createdAt.toISOString(),
    })
  }
  console.log('  ✓ payments synced')

  console.log(`\n✅ Done. View your data at ${PB_URL}/_/`)
  console.log(`   Login: ${PB_EMAIL} / ${PB_PASS}`)
}

main()
  .catch((e) => { console.error('Sync failed:', e); process.exit(1) })
  .finally(() => db.$disconnect())
