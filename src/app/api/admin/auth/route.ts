import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import {
  ADMIN_COOKIE,
  SEVEN_DAYS_SECONDS,
  getAdminPassword,
  setAdminSetting,
} from '@/lib/admin';

/** POST /api/admin/auth — admin login (sets httpOnly fm_admin cookie). */
export async function POST(req: Request) {
  let body: { password?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const password = typeof body.password === 'string' ? body.password : '';
  if (!password) {
    return NextResponse.json(
      { ok: false, error: 'Password required' },
      { status: 400 },
    );
  }

  const expected = await getAdminPassword();
  if (password !== expected) {
    return NextResponse.json(
      { ok: false, error: 'Invalid password' },
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
