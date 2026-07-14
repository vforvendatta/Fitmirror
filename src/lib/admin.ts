import { cookies } from 'next/headers';
import { db } from '@/lib/db';

/** Default admin password used before any custom password is stored. */
export const DEFAULT_ADMIN_PASSWORD = 'fitmirror2024';

export const ADMIN_COOKIE = 'fm_admin';
const ADMIN_TOKEN_KEY = 'admin_token';
const ADMIN_PASSWORD_KEY = 'admin_password';
const SEVEN_DAYS_SECONDS = 60 * 60 * 24 * 7;

/** Reads a single AdminSetting value by key. Returns null if not present. */
export async function getAdminSetting(key: string): Promise<string | null> {
  const row = await db.adminSetting.findUnique({ where: { key } });
  return row?.value ?? null;
}

/** Upserts a single AdminSetting value. */
export async function setAdminSetting(key: string, value: string): Promise<void> {
  await db.adminSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

/**
 * Returns the currently configured admin password.
 * Falls back to DEFAULT_ADMIN_PASSWORD when none is stored.
 */
export async function getAdminPassword(): Promise<string> {
  const stored = await getAdminSetting(ADMIN_PASSWORD_KEY);
  return stored ?? DEFAULT_ADMIN_PASSWORD;
}

/**
 * Returns true iff the request carries a valid `fm_admin` cookie whose value
 * matches the `admin_token` AdminSetting row currently in the DB.
 */
export async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token) return false;

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
  SEVEN_DAYS_SECONDS,
};
