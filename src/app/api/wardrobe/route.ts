import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/lib/db';
import type { WardrobeItemDTO } from '@/lib/types';

export async function GET() {
  try {
    const { id: sessionId } = await getSession();
    const items = await db.wardrobeItem.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
    });

    const dtos: WardrobeItemDTO[] = items.map((item) => ({
      id: item.id,
      name: item.name,
      notes: item.notes,
      personImageUrl: item.personImageUrl,
      garmentImageUrl: item.garmentImageUrl,
      resultImageUrl: item.resultImageUrl,
      createdAt: item.createdAt.toISOString(),
    }));
    return NextResponse.json(dtos, { status: 200 });
  } catch (err) {
    console.error('[/api/wardrobe GET] error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tryOnId, name, notes } = body as {
      tryOnId?: string;
      name?: string;
      notes?: string;
    };

    if (!tryOnId || typeof tryOnId !== 'string') {
      return NextResponse.json({ error: 'tryOnId is required' }, { status: 400 });
    }
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const { id: sessionId } = await getSession();

    // Load the TryOn; must belong to this session
    const tryOn = await db.tryOn.findUnique({ where: { id: tryOnId } });
    if (!tryOn || tryOn.sessionId !== sessionId) {
      return NextResponse.json(
        { error: 'Try-on not found' },
        { status: 404 },
      );
    }

    const created = await db.wardrobeItem.create({
      data: {
        sessionId,
        tryOnId: tryOn.id,
        name: name.trim(),
        notes: notes?.trim() || null,
        personImageUrl: tryOn.personImageUrl,
        garmentImageUrl: tryOn.garmentImageUrl,
        resultImageUrl: tryOn.resultImageUrl,
      },
    });

    const dto: WardrobeItemDTO = {
      id: created.id,
      name: created.name,
      notes: created.notes,
      personImageUrl: created.personImageUrl,
      garmentImageUrl: created.garmentImageUrl,
      resultImageUrl: created.resultImageUrl,
      createdAt: created.createdAt.toISOString(),
    };
    return NextResponse.json(dto, { status: 200 });
  } catch (err) {
    console.error('[/api/wardrobe POST] error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id query is required' }, { status: 400 });
    }

    const { id: sessionId } = await getSession();

    const item = await db.wardrobeItem.findUnique({ where: { id } });
    if (!item || item.sessionId !== sessionId) {
      return NextResponse.json(
        { error: 'Wardrobe item not found' },
        { status: 404 },
      );
    }

    await db.wardrobeItem.delete({ where: { id } });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error('[/api/wardrobe DELETE] error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Internal server error' },
      { status: 500 },
    );
  }
}
