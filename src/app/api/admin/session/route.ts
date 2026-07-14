import { NextResponse } from 'next/server';
import { adminSession } from '@/lib/admin';

/** GET /api/admin/session — returns whether the current request is an admin. */
export async function GET() {
  const { isAdmin } = await adminSession();
  return NextResponse.json({ isAdmin });
}
