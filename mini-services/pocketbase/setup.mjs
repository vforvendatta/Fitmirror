// FitMirror PocketBase setup — creates the admin account + collections via the
// PocketBase admin REST API. Idempotent.
//
// Usage:
//   1. Start PocketBase first:  bun run dev   (in this folder)
//   2. In another terminal:     node setup.mjs
//
// Env: PB_URL (default http://127.0.0.1:8090), PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD

const PB_URL = process.env.PB_URL || 'http://127.0.0.1:8090'
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@fitmirror.local'
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'fitmirror-admin-2024'

// Collections mirror the Prisma schema (sessions, tryons, wardrobe_items,
// usage_logs, admin_settings, payments).
const COLLECTIONS = [
  {
    name: 'sessions',
    type: 'base',
    fields: [
      { name: 'plan', type: 'text', options: { max: 20 } },
      { name: 'created_at', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'last_active', type: 'autodate', onCreate: true, onUpdate: true },
    ],
  },
  {
    name: 'tryons',
    type: 'base',
    fields: [
      { name: 'session', type: 'relation', required: true, options: { collection: 'sessions', cascadeDelete: true, max: 1 } },
      { name: 'person_image_url', type: 'url', required: true },
      { name: 'garment_image_url', type: 'url', required: true },
      { name: 'result_image_url', type: 'url' },
      { name: 'garment_name', type: 'text' },
      { name: 'report', type: 'json' },
      { name: 'variations', type: 'json' },
      { name: 'created_at', type: 'autodate', onCreate: true, onUpdate: false },
    ],
  },
  {
    name: 'wardrobe_items',
    type: 'base',
    fields: [
      { name: 'session', type: 'relation', required: true, options: { collection: 'sessions', cascadeDelete: true, max: 1 } },
      { name: 'tryon', type: 'relation', options: { collection: 'tryons', cascadeDelete: false, max: 1 } },
      { name: 'name', type: 'text', required: true },
      { name: 'notes', type: 'text' },
      { name: 'person_image_url', type: 'url' },
      { name: 'garment_image_url', type: 'url' },
      { name: 'result_image_url', type: 'url' },
      { name: 'created_at', type: 'autodate', onCreate: true, onUpdate: false },
    ],
  },
  {
    name: 'usage_logs',
    type: 'base',
    fields: [
      { name: 'session', type: 'relation', required: true, options: { collection: 'sessions', cascadeDelete: true, max: 1 } },
      { name: 'date', type: 'text', required: true, options: { max: 10 } },
      { name: 'count', type: 'number' },
    ],
  },
  {
    name: 'admin_settings',
    type: 'base',
    fields: [
      { name: 'key', type: 'text', required: true, options: { max: 100 } },
      { name: 'value', type: 'text' },
    ],
  },
  {
    name: 'payments',
    type: 'base',
    fields: [
      { name: 'session', type: 'relation', required: true, options: { collection: 'sessions', cascadeDelete: true, max: 1 } },
      { name: 'amount_cents', type: 'number', required: true },
      { name: 'currency', type: 'text', options: { max: 10 } },
      { name: 'plan', type: 'text', options: { max: 20 } },
      { name: 'status', type: 'text', options: { max: 20 } },
      { name: 'provider', type: 'text', options: { max: 20 } },
      { name: 'provider_payment_id', type: 'text' },
      { name: 'created_at', type: 'autodate', onCreate: true, onUpdate: false },
    ],
  },
]

async function main() {
  console.log('FitMirror PocketBase setup →', PB_URL)

  // 1. Create admin account (idempotent — ignore if exists)
  try {
    const r = await fetch(`${PB_URL}/api/admins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, passwordConfirm: ADMIN_PASSWORD }),
    })
    if (r.ok) console.log('✓ admin account created:', ADMIN_EMAIL)
    else if (r.status === 400) console.log('• admin account already exists')
    else console.log('  admin create →', r.status, await r.text())
  } catch (e) {
    console.error('admin create failed:', e.message)
  }

  // 2. Auth as admin
  const authR = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  if (!authR.ok) { console.error('admin auth failed:', authR.status, await authR.text()); process.exit(1) }
  const { token } = await authR.json()
  console.log('✓ authenticated as admin')
  const headers = { 'Content-Type': 'application/json', Authorization: token }

  // 3. Create collections (idempotent — skip if exists)
  for (const col of COLLECTIONS) {
    try {
      const r = await fetch(`${PB_URL}/api/collections`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...col, schema: col.fields }),
      })
      if (r.ok) console.log('✓ collection created:', col.name)
      else if (r.status === 400) console.log('• collection exists:', col.name)
      else console.log(`  ${col.name} →`, r.status, (await r.text()).slice(0, 120))
    } catch (e) {
      console.log(`  ${col.name} error:`, e.message)
    }
  }

  // 4. Make all collections publicly readable/writable enough for the app
  //    (the Next.js backend talks to PB as admin; end users never touch PB directly).
  console.log('\nDone. Admin UI:', PB_URL + '/_/')
  console.log('Admin login:', ADMIN_EMAIL, '/', ADMIN_PASSWORD)
}

main().catch((e) => { console.error(e); process.exit(1) })
