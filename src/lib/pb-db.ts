/**
 * PocketBase data-access layer that mirrors the Prisma client surface used
 * by the FitMirror app. Activated when BACKEND=pocketbase (see src/lib/db.ts).
 *
 * Maps PocketBase snake_case fields + ISO strings → Prisma camelCase + Date,
 * and emulates compound uniques (sessionId_date) + atomic increments.
 */
import {
  pbGet,
  pbList,
  pbCreate,
  pbUpdate,
  pbDelete,
  pbCount,
} from './pb'

/* ---------------- mappers (PB record → app record) ---------------- */

type PbRec = Record<string, any>

function mapSession(r: PbRec | null) {
  if (!r) return null
  return {
    id: r.id,
    plan: r.plan || 'free',
    createdAt: r.created_at ? new Date(r.created_at) : new Date(),
    lastActive: r.last_active ? new Date(r.last_active) : new Date(),
  }
}

function mapTryOn(r: PbRec | null) {
  if (!r) return null
  return {
    id: r.id,
    sessionId: r.session || null,
    personImageUrl: r.person_image_url,
    garmentImageUrl: r.garment_image_url,
    resultImageUrl: r.result_image_url || null,
    garmentName: r.garment_name || null,
    report: r.report || null,
    createdAt: r.created_at ? new Date(r.created_at) : new Date(),
  }
}

function mapWardrobeItem(r: PbRec | null) {
  if (!r) return null
  return {
    id: r.id,
    sessionId: r.session || null,
    tryOnId: r.tryon || null,
    name: r.name,
    notes: r.notes || null,
    personImageUrl: r.person_image_url || null,
    garmentImageUrl: r.garment_image_url || null,
    resultImageUrl: r.result_image_url || null,
    createdAt: r.created_at ? new Date(r.created_at) : new Date(),
  }
}

function mapUsageLog(r: PbRec | null) {
  if (!r) return null
  return {
    id: r.id,
    sessionId: r.session || null,
    date: r.date,
    count: r.count ?? 0,
  }
}

function mapAdminSetting(r: PbRec | null) {
  if (!r) return null
  return {
    id: r.id,
    key: r.key,
    value: r.value ?? null,
    updatedAt: r.updated ? new Date(r.updated) : new Date(),
  }
}

function mapPayment(r: PbRec | null) {
  if (!r) return null
  return {
    id: r.id,
    sessionId: r.session || null,
    amountCents: r.amount_cents,
    currency: r.currency || 'USD',
    plan: r.plan,
    status: r.status || 'succeeded',
    provider: r.provider || null,
    providerPaymentId: r.provider_payment_id || null,
    createdAt: r.created_at ? new Date(r.created_at) : new Date(),
  }
}

/* ---------------- helpers ---------------- */

/** Build a PB filter string from a Prisma-style where object (best-effort). */
const FIELD_MAP: Record<string, string> = {
  sessionId: 'session',
  tryOnId: 'tryon',
  providerPaymentId: 'provider_payment_id',
  amountCents: 'amount_cents',
  personImageUrl: 'person_image_url',
  garmentImageUrl: 'garment_image_url',
  resultImageUrl: 'result_image_url',
  garmentName: 'garment_name',
}

function buildFilter(where: Record<string, any> = {}): string | undefined {
  const parts: string[] = []
  for (const [k, v] of Object.entries(where)) {
    if (v === undefined || v === null) continue
    const field = FIELD_MAP[k] ?? k
    parts.push(`${field}="${String(v)}"`)
  }
  return parts.length ? parts.join(' && ') : undefined
}

function buildSort(orderBy: any): string | undefined {
  if (!orderBy) return undefined
  if (typeof orderBy === 'string') return orderBy
  // { createdAt: 'desc' } → '-created_at'
  const [[field, dir]] = Object.entries(orderBy)
  const pbField =
    field === 'createdAt' ? 'created_at' :
    field === 'lastActive' ? 'last_active' :
    field === 'updatedAt' ? 'updated' :
    field
  return dir === 'desc' ? `-${pbField}` : pbField
}

/** Project a record to only the selected fields (Prisma `select` emulation). */
function applySelect<T extends Record<string, any>>(rec: T | null, select?: Record<string, boolean>): Partial<T> | null {
  if (!rec || !select) return rec
  const out: any = {}
  for (const k of Object.keys(select)) if (select[k] && k in rec) out[k] = rec[k]
  return out
}

/* ---------------- adapter ---------------- */

export const pbDb = {
  session: {
    async findUnique({ where, select }: { where: { id: string }; select?: Record<string, boolean> }) {
      const r = await pbGet('sessions', where.id)
      return applySelect(mapSession(r), select)
    },
    async findMany({ where, orderBy, take }: { where?: Record<string, any>; orderBy?: any; take?: number } = {}) {
      const { items } = await pbList('sessions', {
        filter: buildFilter(where),
        sort: buildSort(orderBy),
        perPage: take ?? 200,
      })
      return items.map(mapSession)
    },
    async create({ data }: { data: Record<string, any> }) {
      const payload: Record<string, unknown> = { plan: data.plan || 'free' }
      if (data.createdAt) payload.created_at = new Date(data.createdAt).toISOString()
      if (data.lastActive) payload.last_active = new Date(data.lastActive).toISOString()
      const r = await pbCreate('sessions', payload)
      return mapSession(r)
    },
    async update({ where, data }: { where: { id: string }; data: Record<string, any> }) {
      const payload: Record<string, unknown> = {}
      if (data.plan !== undefined) payload.plan = data.plan
      if (data.lastActive) payload.last_active = new Date(data.lastActive).toISOString()
      const r = await pbUpdate('sessions', where.id, payload)
      return mapSession(r)
    },
    async count({ where }: { where?: Record<string, any> } = {}) {
      return pbCount('sessions', buildFilter(where))
    },
  },

  tryOn: {
    async findUnique({ where }: { where: { id: string } }) {
      return mapTryOn(await pbGet('tryons', where.id))
    },
    async findMany({ where, orderBy, take }: { where?: Record<string, any>; orderBy?: any; take?: number } = {}) {
      const { items } = await pbList('tryons', {
        filter: buildFilter(where),
        sort: buildSort(orderBy),
        perPage: take ?? 200,
      })
      return items.map(mapTryOn)
    },
    async create({ data }: { data: Record<string, any> }) {
      const r = await pbCreate('tryons', {
        session: data.sessionId,
        person_image_url: data.personImageUrl,
        garment_image_url: data.garmentImageUrl,
        result_image_url: data.resultImageUrl || '',
        garment_name: data.garmentName || '',
        report: data.report || '{}',
      })
      return mapTryOn(r)
    },
    async count({ where }: { where?: Record<string, any> } = {}) {
      return pbCount('tryons', buildFilter(where))
    },
  },

  wardrobeItem: {
    async findUnique({ where }: { where: { id: string } }) {
      return mapWardrobeItem(await pbGet('wardrobe_items', where.id))
    },
    async findMany({ where, orderBy, take }: { where?: Record<string, any>; orderBy?: any; take?: number } = {}) {
      const { items } = await pbList('wardrobe_items', {
        filter: buildFilter(where),
        sort: buildSort(orderBy),
        perPage: take ?? 200,
      })
      return items.map(mapWardrobeItem)
    },
    async create({ data }: { data: Record<string, any> }) {
      const r = await pbCreate('wardrobe_items', {
        session: data.sessionId,
        tryon: data.tryOnId || '',
        name: data.name,
        notes: data.notes || '',
        person_image_url: data.personImageUrl || '',
        garment_image_url: data.garmentImageUrl || '',
        result_image_url: data.resultImageUrl || '',
      })
      return mapWardrobeItem(r)
    },
    async delete({ where }: { where: { id: string } }) {
      await pbDelete('wardrobe_items', where.id)
      return { id: where.id }
    },
  },

  usageLog: {
    // Emulate the compound unique (sessionId, date).
    async findUnique({ where }: { where: { sessionId_date?: { sessionId: string; date: string }; id?: string } }) {
      if (where.id) return mapUsageLog(await pbGet('usage_logs', where.id))
      const { sessionId, date } = where.sessionId_date || {}
      if (!sessionId || !date) return null
      const { items } = await pbList('usage_logs', {
        filter: `session="${sessionId}" && date="${date}"`,
        perPage: 1,
      })
      return mapUsageLog(items[0] || null)
    },
    // Emulate upsert + atomic increment (read-then-write; acceptable for this app).
    async upsert({ where, create, update }: {
      where: { sessionId_date: { sessionId: string; date: string } }
      create: { sessionId: string; date: string; count: number }
      update: { count?: { increment: number } }
    }) {
      const { sessionId, date } = where.sessionId_date
      const { items } = await pbList('usage_logs', {
        filter: `session="${sessionId}" && date="${date}"`,
        perPage: 1,
      })
      if (items.length === 0) {
        const r = await pbCreate('usage_logs', {
          session: create.sessionId,
          date: create.date,
          count: create.count,
        })
        return mapUsageLog(r)
      }
      const existing = items[0]
      const inc = update.count?.increment ?? 0
      const r = await pbUpdate('usage_logs', existing.id, { count: (existing.count ?? 0) + inc })
      return mapUsageLog(r)
    },
  },

  adminSetting: {
    async findUnique({ where }: { where: { key: string } }) {
      const { items } = await pbList('admin_settings', {
        filter: `key="${where.key}"`,
        perPage: 1,
      })
      return mapAdminSetting(items[0] || null)
    },
    async findMany() {
      const { items } = await pbList('admin_settings', { perPage: 200 })
      return items.map(mapAdminSetting)
    },
    async upsert({ where, create, update }: {
      where: { key: string }
      create: { key: string; value: string }
      update: { value: string }
    }) {
      const { items } = await pbList('admin_settings', {
        filter: `key="${where.key}"`,
        perPage: 1,
      })
      if (items.length === 0) {
        const r = await pbCreate('admin_settings', { key: create.key, value: create.value })
        return mapAdminSetting(r)
      }
      const r = await pbUpdate('admin_settings', items[0].id, { value: update.value })
      return mapAdminSetting(r)
    },
  },

  payment: {
    async findMany({ where, orderBy, take }: { where?: Record<string, any>; orderBy?: any; take?: number } = {}) {
      const { items } = await pbList('payments', {
        filter: buildFilter(where),
        sort: buildSort(orderBy),
        perPage: take ?? 200,
      })
      return items.map(mapPayment)
    },
    async findFirst({ where, orderBy }: { where?: Record<string, any>; orderBy?: any } = {}) {
      const { items } = await pbList('payments', {
        filter: buildFilter(where),
        sort: buildSort(orderBy),
        perPage: 1,
      })
      return items[0] ? mapPayment(items[0]) : null
    },
    async create({ data }: { data: Record<string, any> }) {
      const r = await pbCreate('payments', {
        session: data.sessionId,
        amount_cents: data.amountCents,
        currency: data.currency || 'USD',
        plan: data.plan,
        status: data.status || 'succeeded',
        provider: data.provider || '',
        provider_payment_id: data.providerPaymentId || '',
      })
      return mapPayment(r)
    },
  },
}

export type PbDb = typeof pbDb
