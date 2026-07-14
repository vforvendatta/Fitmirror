/**
 * Smoke-test the PocketBase data adapter (src/lib/pb-db.ts) against a live
 * PocketBase instance. Proves every operation the app uses works end-to-end.
 *
 * Run AFTER starting PocketBase + setup.mjs:
 *   POCKETBASE_URL=http://127.0.0.1:8090 bun run scripts/test-pb-db.ts
 */
import { pbDb } from '../src/lib/pb-db'

let pass = 0, fail = 0
const ok = (name: string, cond: boolean, extra = '') => {
  if (cond) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; console.log(`  ✗ ${name} ${extra}`) }
}

async function main() {
  console.log('Testing pb-db adapter against PocketBase…\n')

  // 1. session.create + findUnique
  console.log('[session]')
  const s = await pbDb.session.create({ data: {} })
  ok('create returns id', !!s?.id, JSON.stringify(s))
  ok('create plan=free', s?.plan === 'free')
  const found = await pbDb.session.findUnique({ where: { id: s.id } })
  ok('findUnique by id', found?.id === s.id)
  const foundPlan = await pbDb.session.findUnique({ where: { id: s.id }, select: { plan: true } })
  ok('findUnique with select', foundPlan?.plan === 'free' && !('id' in (foundPlan as any)), JSON.stringify(foundPlan))
  const updated = await pbDb.session.update({ where: { id: s.id }, data: { plan: 'pro', lastActive: new Date() } })
  ok('update plan→pro', updated?.plan === 'pro')
  ok('update is Date', updated?.lastActive instanceof Date)

  // 2. session.findMany + count
  const s2 = await pbDb.session.create({ data: {} })
  const many = await pbDb.session.findMany({ orderBy: { createdAt: 'desc' }, take: 10 })
  ok('findMany returns array', Array.isArray(many) && many.length >= 2)
  ok('findMany ordered desc', many[0].createdAt >= many[1].createdAt)
  const cnt = await pbDb.session.count()
  ok('count >= 2', cnt >= 2, `got ${cnt}`)

  // 3. tryOn
  console.log('[tryOn]')
  const t = await pbDb.tryOn.create({
    data: {
      sessionId: s.id,
      personImageUrl: '/uploads/p.png',
      garmentImageUrl: '/uploads/g.png',
      resultImageUrl: '/uploads/r.png',
      garmentName: 'Test Gown',
      report: '{"fitScore":80}',
    },
  })
  ok('create returns id', !!t?.id)
  ok('sessionId mapped', t?.sessionId === s.id)
  ok('garmentName mapped', t?.garmentName === 'Test Gown')
  ok('createdAt is Date', t?.createdAt instanceof Date)
  const tFound = await pbDb.tryOn.findUnique({ where: { id: t.id } })
  ok('findUnique', tFound?.id === t.id)
  const tMany = await pbDb.tryOn.findMany({ where: { sessionId: s.id }, orderBy: { createdAt: 'desc' }, take: 5 })
  ok('findMany by sessionId', tMany.length >= 1 && tMany[0].sessionId === s.id)
  const tCnt = await pbDb.tryOn.count({ where: { sessionId: s.id } })
  ok('count by sessionId >= 1', tCnt >= 1, `got ${tCnt}`)

  // 4. wardrobeItem
  console.log('[wardrobeItem]')
  const w = await pbDb.wardrobeItem.create({
    data: { sessionId: s.id, tryOnId: t.id, name: 'My Look', notes: 'nice' },
  })
  ok('create returns id', !!w?.id)
  ok('tryOnId mapped', w?.tryOnId === t.id)
  const wMany = await pbDb.wardrobeItem.findMany({ where: { sessionId: s.id }, orderBy: { createdAt: 'desc' } })
  ok('findMany by sessionId', wMany.length >= 1)
  await pbDb.wardrobeItem.delete({ where: { id: w.id } })
  const wGone = await pbDb.wardrobeItem.findUnique({ where: { id: w.id } })
  ok('delete removes record', wGone === null)

  // 5. usageLog (compound unique + increment)
  console.log('[usageLog]')
  const date = '2026-07-14'
  const before = await pbDb.usageLog.findUnique({ where: { sessionId_date: { sessionId: s.id, date } } })
  ok('findUnique compound (null if new)', before === null)
  await pbDb.usageLog.upsert({
    where: { sessionId_date: { sessionId: s.id, date } },
    create: { sessionId: s.id, date, count: 1 },
    update: { count: { increment: 1 } },
  })
  const after1 = await pbDb.usageLog.findUnique({ where: { sessionId_date: { sessionId: s.id, date } } })
  ok('upsert create → count=1', after1?.count === 1, JSON.stringify(after1))
  await pbDb.usageLog.upsert({
    where: { sessionId_date: { sessionId: s.id, date } },
    create: { sessionId: s.id, date, count: 1 },
    update: { count: { increment: 1 } },
  })
  const after2 = await pbDb.usageLog.findUnique({ where: { sessionId_date: { sessionId: s.id, date } } })
  ok('upsert increment → count=2', after2?.count === 2, JSON.stringify(after2))

  // 6. adminSetting
  console.log('[adminSetting]')
  const aBefore = await pbDb.adminSetting.findUnique({ where: { key: 'test.key' } })
  ok('findUnique missing → null', aBefore === null)
  await pbDb.adminSetting.upsert({ where: { key: 'test.key' }, create: { key: 'test.key', value: 'v1' }, update: { value: 'v1' } })
  const a1 = await pbDb.adminSetting.findUnique({ where: { key: 'test.key' } })
  ok('upsert create → value=v1', a1?.value === 'v1')
  await pbDb.adminSetting.upsert({ where: { key: 'test.key' }, create: { key: 'test.key', value: 'X' }, update: { value: 'v2' } })
  const a2 = await pbDb.adminSetting.findUnique({ where: { key: 'test.key' } })
  ok('upsert update → value=v2', a2?.value === 'v2')
  const aMany = await pbDb.adminSetting.findMany()
  ok('findMany returns array', Array.isArray(aMany) && aMany.some((x: any) => x.key === 'test.key'))

  // 7. payment
  console.log('[payment]')
  const p = await pbDb.payment.create({
    data: { sessionId: s.id, amountCents: 999, currency: 'USD', plan: 'pro', status: 'succeeded', provider: 'dodo', providerPaymentId: 'pay_123' },
  })
  ok('create returns id', !!p?.id)
  ok('amountCents mapped', p?.amountCents === 999)
  ok('providerPaymentId mapped', p?.providerPaymentId === 'pay_123')
  const pFirst = await pbDb.payment.findFirst({ where: { providerPaymentId: 'pay_123' }, orderBy: { createdAt: 'desc' } })
  ok('findFirst by providerPaymentId', pFirst?.id === p.id)
  const pMany = await pbDb.payment.findMany({ orderBy: { createdAt: 'desc' }, take: 10 })
  ok('findMany returns array', Array.isArray(pMany) && pMany.length >= 1)

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail === 0 ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(1) })
