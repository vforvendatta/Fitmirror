import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getTodayUsage } from '@/lib/usage';
import type { UsageDTO } from '@/lib/types';

export async function GET() {
  try {
    const { id: sessionId } = await getSession();
    const usage = await getTodayUsage(sessionId);
    const payload: UsageDTO = usage;
    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    console.error('[/api/usage] error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Internal server error' },
      { status: 500 },
    );
  }
}
