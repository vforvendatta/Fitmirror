// FitMirror PocketBase setup (v0.23+) — creates the superuser + collections.
// Idempotent.
//
// Usage:
//   1. Start PocketBase:  ./pocketbase serve  (in this folder)
//   2. Create superuser:  ./pocketbase superuser upsert admin@fitmirror.local 'fitmirror-admin-2024'
//   3. Run:               node setup.mjs

const PB_URL = process.env.PB_URL || 'http://127.0.0.1:8090'
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@fitmirror.local'
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'fitmirror-admin-2024'

// PocketBase v0.23 collection field definitions.
// Each field: { name, type, required?, options?: {...}, ... }
const COLLECTIONS = [
  {
    name: 'sessions',
    type: 'base',
    fields: [
      { name: 'plan', type: 'text', required: false, options: { max: 20 } },
      { name: 'created_at', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'last_active', type: 'autodate', onCreate: true, onUpdate: true },
    ],
  },
  {
    name: 'tryons',
    type: 'base',
    fields: [
      { name: 'session', type: 'text', required: true },
      { name: 'person_image_url', type: 'text', required: true },
      { name: 'garment_image_url', type: 'text', required: true },
      { name: 'result_image_url', type: 'text', required: false },
      { name: 'garment_name', type: 'text', required: false },
      { name: 'report', type: 'json', required: false },
      { name: 'created_at', type: 'autodate', onCreate: true, onUpdate: false },
    ],
  },
  {
    name: 'wardrobe_items',
    type: 'base',
    fields: [
      { name: 'session', type: 'text', required: true },
      { name: 'tryon', type: 'text', required: false },
      { name: 'name', type: 'text', required: true },
      { name: 'notes', type: 'text', required: false },
      { name: 'person_image_url', type: 'text', required: false },
      { name: 'garment_image_url', type: 'text', required: false },
      { name: 'result_image_url', type: 'text', required: false },
      { name: 'created_at', type: 'autodate', onCreate: true, onUpdate: false },
    ],
  },
  {
    name: 'usage_logs',
    type: 'base',
    fields: [
      { name: 'session', type: 'text', required: true },
      { name: 'date', type: 'text', required: true, options: { max: 10 } },
      { name: 'count', type: 'number', required: false },
    ],
  },
  {
    name: 'admin_settings',
    type: 'base',
    fields: [
      { name: 'key', type: 'text', required: true, options: { max: 100 } },
      { name: 'value', type: 'text', required: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ],
  },
  {
    name: 'payments',
    type: 'base',
    fields: [
      { name: 'session', type: 'text', required: true },
      { name: 'amount_cents', type: 'number', required: true },
      { name: 'currency', type: 'text', required: false, options: { max: 10 } },
      { name: 'plan', type: 'text', required: false, options: { max: 20 } },
      { name: 'status', type: 'text', required: false, options: { max: 20 } },
      { name: 'provider', type: 'text', required: false, options: { max: 20 } },
      { name: 'provider_payment_id', type: 'text', required: false },
      { name: 'created_at', type: 'autodate', onCreate: true, onUpdate: false },
    ],
  },
]

async function main() {
  console.log('FitMirror PocketBase setup →', PB_URL)

  // Auth as superuser (v0.23: _superusers collection)
  const authR = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  if (!authR.ok) {
    console.error('superuser auth failed:', authR.status, await authR.text())
    console.error('Create the superuser first: ./pocketbase superuser upsert ' + ADMIN_EMAIL + ' ' + ADMIN_PASSWORD)
    process.exit(1)
  }
  const { token } = await authR.json()
  console.log('✓ authenticated as superuser')
  const headers = { 'Content-Type': 'application/json', Authorization: token }

  // Create collections (idempotent — skip if exists)
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

  console.log('\nDone. Admin UI:', PB_URL + '/_/')
  console.log('Superuser:', ADMIN_EMAIL, '/', ADMIN_PASSWORD)
}

main().catch((e) => { console.error(e); process.exit(1) })
