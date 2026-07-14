import { cookies } from 'next/headers';
import { db } from '@/lib/db';

export const SESSION_COOKIE = 'fm_session';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Returns the anonymous session id for the current request.
 * Reads the `fm_session` cookie; if missing or pointing to a
 * non-existent Session row, creates a new one and sets the cookie.
 * Also updates `lastActive` on every call.
 */
export async function getSession(): Promise<{ id: string }> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(SESSION_COOKIE)?.value;

  if (existing) {
    const row = await db.session.findUnique({ where: { id: existing } });
    if (row) {
      await db.session.update({
        where: { id: row.id },
        data: { lastActive: new Date() },
      });
      return { id: row.id };
    }
  }

  // Create a fresh anonymous session
  const created = await db.session.create({ data: {} });
  cookieStore.set(SESSION_COOKIE, created.id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: ONE_YEAR_SECONDS,
  });
  return { id: created.id };
}
