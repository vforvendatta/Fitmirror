import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/lib/db';
import type { HistoryDTO, StyleReport } from '@/lib/types';

export async function GET() {
  try {
    const { id: sessionId } = await getSession();

    const rows = await db.tryOn.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    const dtos: HistoryDTO[] = rows.map((row) => {
      let report: StyleReport | null = null;
      if (row.report) {
        try {
          report = JSON.parse(row.report) as StyleReport;
        } catch {
          report = null;
        }
      }
      return {
        id: row.id,
        personImageUrl: row.personImageUrl,
        garmentImageUrl: row.garmentImageUrl,
        resultImageUrl: row.resultImageUrl,
        garmentName: row.garmentName,
        report,
        createdAt: row.createdAt.toISOString(),
      };
    });

    return NextResponse.json(dtos, { status: 200 });
  } catch (err) {
    console.error('[/api/history] error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Internal server error' },
      { status: 500 },
    );
  }
}
