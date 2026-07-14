import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getTodayUsage, incrementUsage } from '@/lib/usage';
import { saveDataUrl, resolveGarmentImage, saveBase64Image } from '@/lib/images';
import { runTryOn } from '@/lib/ai-tryon';
import { db } from '@/lib/db';
import type { TryOnResult } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { personImage, garmentImage, garmentName, variations } = body as {
      personImage?: string;
      garmentImage?: string;
      garmentName?: string;
      variations?: number;
    };
    const variationCount = Math.min(4, Math.max(1, Number(variations) || 1));

    if (
      !personImage ||
      typeof personImage !== 'string' ||
      !personImage.startsWith('data:')
    ) {
      return NextResponse.json(
        { error: 'personImage must be a data URL' },
        { status: 400 },
      );
    }
    if (!garmentImage || typeof garmentImage !== 'string') {
      return NextResponse.json(
        { error: 'garmentImage must be a data URL or a public path' },
        { status: 400 },
      );
    }

    // Session (sets cookie automatically)
    const { id: sessionId } = await getSession();

    // Usage check (free tier = 3/day)
    const usage = await getTodayUsage(sessionId);
    if (usage.used >= usage.limit) {
      return NextResponse.json(
        { error: 'Free limit reached', usage },
        { status: 402 },
      );
    }

    // Save person image (always a data URL)
    const personImageUrl = await saveDataUrl(personImage);

    // Resolve garment (data URL OR /discover/... path) → uploads
    const garment = await resolveGarmentImage(garmentImage);
    const garmentImageUrl = garment.urlPath;
    const garmentBuffer = garment.buffer;

    // Read the saved person file back into a buffer for the pipeline
    const { promises: fs } = await import('fs');
    const path = await import('path');
    const personAbs = path.join(process.cwd(), 'public', personImageUrl);
    const personBuffer = await fs.readFile(personAbs);

    // Run the AI try-on pipeline
    let pipelineResult;
    try {
      pipelineResult = await runTryOn({ personBuffer, garmentBuffer, variations: variationCount });
    } catch (aiErr) {
      console.error('[/api/tryon] AI pipeline failed:', aiErr);
      return NextResponse.json(
        { error: (aiErr as Error).message || 'AI try-on failed' },
        { status: 500 },
      );
    }

    const { report, resultImageBase64, variations: variationBase64s } = pipelineResult;

    // Save the generated result image(s) to disk
    const resultImageUrl = await saveBase64Image(resultImageBase64, 'png');
    const variationUrls: string[] = [];
    for (const b64 of variationBase64s) {
      variationUrls.push(await saveBase64Image(b64, 'png'));
    }

    // Persist the TryOn row
    const tryOn = await db.tryOn.create({
      data: {
        sessionId,
        personImageUrl,
        garmentImageUrl,
        resultImageUrl,
        garmentName: garmentName || null,
        report: JSON.stringify(report),
      },
    });

    // Increment daily usage
    await incrementUsage(sessionId);

    const payload: TryOnResult = {
      tryOnId: tryOn.id,
      resultImageUrl,
      report,
      variations: variationUrls,
    };
    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    console.error('[/api/tryon] unexpected error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Internal server error' },
      { status: 500 },
    );
  }
}
