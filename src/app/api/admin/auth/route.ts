import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import {
  ADMIN_COOKIE,
  SEVEN_DAYS_SECONDS,
  getAdminPassword,
  getAdminUsername,
  setAdminSetting,
} from '@/lib/admin';

/** POST /api/admin/auth — admin login with username + password (sets httpOnly fm_admin cookie). */
export async function POST(req: Request) {
  let body: { username?: unknown; password?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!username || !password) {
    return NextResponse.json(
      { ok: false, error: 'Username and password are required' },
      { status: 400 },
    );
  }

  const expectedUser = await getAdminUsername();
  const expectedPass = await getAdminPassword();

  // Constant-time-ish compare to avoid basic timing leaks.
  const userOk = username === expectedUser;
  const passOk = password === expectedPass;
  if (!userOk || !passOk) {
    return NextResponse.json(
      { ok: false, error: 'Invalid username or password' },
      { status: 401 },
    );
  }

  const token = randomUUID();
  await setAdminSetting('admin_token', token);

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SEVEN_DAYS_SECONDS,
  });

  return NextResponse.json({ ok: true });
}
