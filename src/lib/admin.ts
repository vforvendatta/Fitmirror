import { cookies } from 'next/headers';
import { db } from '@/lib/db';

/** Default admin credentials used before any custom values are stored. */
export const DEFAULT_ADMIN_USERNAME = 'admin';
export const DEFAULT_ADMIN_PASSWORD = 'fitmirror2024';

export const ADMIN_COOKIE = 'fm_admin';
const ADMIN_TOKEN_KEY = 'admin_token';
const ADMIN_PASSWORD_KEY = 'admin_password';
const ADMIN_USERNAME_KEY = 'admin_username';
const SEVEN_DAYS_SECONDS = 60 * 60 * 24 * 7;

/** Reads a single AdminSetting value by key. Returns null if not present
 *  (or if the backend is unreachable / collection missing). */
export async function getAdminSetting(key: string): Promise<string | null> {
  try {
    const row = await db.adminSetting.findUnique({ where: { key } });
    return row?.value ?? null;
  } catch (e) {
    // Backend unreachable, collection not created yet, etc.
    // Don't crash admin auth — fall back to defaults.
    console.warn(`[admin] getAdminSetting(${key}) failed, using default:`, (e as Error).message);
    return null;
  }
}

/** Upserts a single AdminSetting value. Logs but does not throw on failure. */
export async function setAdminSetting(key: string, value: string): Promise<void> {
  try {
    await db.adminSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  } catch (e) {
    // If the backend is down or the collection is missing, we can't persist.
    // For the admin token specifically, keep it in-memory so the session
    // still works for the lifetime of this server process.
    if (key === ADMIN_TOKEN_KEY) inMemoryTokens.add(value);
    console.error(`[admin] setAdminSetting(${key}) failed:`, (e as Error).message);
  }
}

/** Returns the currently configured admin username (default 'admin'). */
export async function getAdminUsername(): Promise<string> {
  const stored = await getAdminSetting(ADMIN_USERNAME_KEY);
  return stored ?? DEFAULT_ADMIN_USERNAME;
}

/** Returns the currently configured admin password. */
export async function getAdminPassword(): Promise<string> {
  const stored = await getAdminSetting(ADMIN_PASSWORD_KEY);
  return stored ?? DEFAULT_ADMIN_PASSWORD;
}

/**
 * Returns true iff the request carries a valid `fm_admin` cookie whose value
 * matches the `admin_token` AdminSetting row currently in the DB.
 *
 * Falls back to an in-memory token set during this server process's lifetime
 * when the backend is unreachable (so admin login still works even if the
 * DB / PocketBase is down or the admin_settings collection is missing).
 */
const inMemoryTokens = new Set<string>()

export async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token) return false;

  // In-memory fallback (backend was down at login time)
  if (inMemoryTokens.has(token)) return true;

  const storedToken = await getAdminSetting(ADMIN_TOKEN_KEY);
  if (!storedToken) return false;
  return token === storedToken;
}

/** Lightweight session info for the admin UI. */
export async function adminSession(): Promise<{ isAdmin: boolean }> {
  return { isAdmin: await isAdmin() };
}

export {
  ADMIN_TOKEN_KEY,
  ADMIN_PASSWORD_KEY,
  ADMIN_USERNAME_KEY,
  SEVEN_DAYS_SECONDS,
};
