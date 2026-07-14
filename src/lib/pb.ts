/**
 * PocketBase admin-authenticated REST client.
 *
 * Talks to the PocketBase admin API (https://pocketbase.io/docs/api-admins)
 * to create/auth as a superuser, then perform CRUD on collections.
 *
 * Used by src/lib/pb-db.ts (the Prisma-shaped adapter) when BACKEND=pocketbase.
 */

const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090'
const PB_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@fitmirror.local'
const PB_PASS = process.env.POCKETBASE_ADMIN_PASSWORD || 'fitmirror-admin-2024'

let cachedToken: { token: string; expires: number } | null = null

/** Authenticate as the PocketBase superuser, caching the token (~1h TTL). */
export async function pbAdminToken(): Promise<string> {
  const now = Date.now()
  if (cachedToken && cachedToken.expires > now + 60_000) return cachedToken.token

  // PocketBase v0.23+: admins are "_superusers" and auth via the collections API.
  const r = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASS }),
  })
  if (!r.ok) {
    const t = await r.text().catch(() => '')
    throw new Error(`PocketBase admin auth failed (${r.status}): ${t.slice(0, 160)}`)
  }
  const d = await r.json()
  cachedToken = { token: d.token, expires: now + 55 * 60 * 1000 }
  return d.token
}

/** Raw fetch wrapper that injects the admin token + JSON headers. */
export async function pbFetch<T = any>(
  path: string,
  opts: RequestInit = {},
): Promise<T> {
  const token = await pbAdminToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: token,
    ...(opts.headers as Record<string, string>),
  }
  const r = await fetch(`${PB_URL}${path}`, { ...opts, headers })
  if (r.status === 404) return null as T
  if (!r.ok) {
    const t = await r.text().catch(() => '')
    throw new Error(`PocketBase ${path} → ${r.status}: ${t.slice(0, 200)}`)
  }
  if (r.status === 204) return null as T
  return r.json().catch(() => null as T)
}

/** List records with optional filter/sort/page. Returns { items, totalItems }. */
export async function pbList<T = any>(
  collection: string,
  opts: {
    filter?: string
    sort?: string
    page?: number
    perPage?: number
  } = {},
): Promise<{ items: T[]; totalItems: number }> {
  const params = new URLSearchParams()
  if (opts.filter) params.set('filter', opts.filter)
  if (opts.sort) params.set('sort', opts.sort)
  params.set('page', String(opts.page ?? 1))
  params.set('perPage', String(opts.perPage ?? 200))
  const d = await pbFetch<any>(`/api/collections/${collection}/records?${params}`)
  return { items: d?.items ?? [], totalItems: d?.totalItems ?? 0 }
}

/** Get a single record by id. Returns null if not found. */
export async function pbGet<T = any>(collection: string, id: string): Promise<T | null> {
  return pbFetch<T>(`/api/collections/${collection}/records/${id}`)
}

/** Create a record. Returns the created record. */
export async function pbCreate<T = any>(
  collection: string,
  data: Record<string, unknown>,
): Promise<T> {
  return pbFetch<T>(`/api/collections/${collection}/records`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/** Update a record by id (PATCH). Returns the updated record. */
export async function pbUpdate<T = any>(
  collection: string,
  id: string,
  data: Record<string, unknown>,
): Promise<T> {
  return pbFetch<T>(`/api/collections/${collection}/records/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/** Delete a record by id. */
export async function pbDelete(collection: string, id: string): Promise<void> {
  await pbFetch(`/api/collections/${collection}/records/${id}`, { method: 'DELETE' })
}

/** Count records matching a filter (uses list with perPage=1). */
export async function pbCount(collection: string, filter?: string): Promise<number> {
  const { totalItems } = await pbList(collection, { filter, perPage: 1 })
  return totalItems
}

export const PB_URL_EXPORTED = PB_URL
