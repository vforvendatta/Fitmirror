import ZAI from 'z-ai-web-dev-sdk';
import type { StyleReport } from '@/lib/types';

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function toDataUrl(buf: Buffer, mime = 'image/png'): string {
  return `data:${mime};base64,${buf.toString('base64')}`;
}

/**
 * Robust JSON extractor: strips ```json fences, finds the first `{` and
 * the last `}` in the text, and JSON.parses the slice. Returns a sane
 * fallback object on failure so the pipeline never crashes.
 */
export function extractJson<T = unknown>(text: string, fallback: T): T {
  if (!text) return fallback;
  let t = text.trim();

  // Strip markdown code fences if present (```json ... ``` or ``` ... ```)
  const fenceMatch = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    t = fenceMatch[1].trim();
  }

  // Find first { and last } to extract the JSON object body
  const first = t.indexOf('{');
  const last = t.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    const slice = t.slice(first, last + 1);
    try {
      return JSON.parse(slice) as T;
    } catch {
      /* fall through */
    }
  }

  // Last attempt: parse the whole string
  try {
    return JSON.parse(t) as T;
  } catch {
    return fallback;
  }
}

/* ------------------------------------------------------------------ */
/* Person & garment analysis                                          */
/* ------------------------------------------------------------------ */

interface PersonAnalysis {
  genderPresentation: string;
  ageBand: string;
  ethnicityCues: string;
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  bodyType: string;
  heightBand: string;
  buildDescription: string;
  faceDescription: string;
  poseDescription: string;
  clothingCurrentlyWorn: string;
}

interface GarmentAnalysis {
  name: string;
  category: string;
  colorPrimary: string;
  colorSecondary: string;
  pattern: string;
  fabric: string;
  neckline: string;
  sleeveStyle: string;
  length: string;
  fit: string;
  formality: string;
  season: string;
  occasions: string[];
  description: string;
}

const PERSON_PROMPT = `Analyze this full-body photo for virtual try-on. Return ONLY compact JSON (no markdown) with keys:
genderPresentation, ageBand, ethnicityCues, skinTone (warm/cool/neutral + light/medium/deep), hairStyle, hairColor, bodyType (one of: slim, athletic, curvy, plus, petite, tall, hourglass, pear, apple), heightBand, buildDescription (2-3 sentences: shoulders, waist, hips, posture), faceDescription (2 sentences: face shape, features), poseDescription (1 sentence), clothingCurrentlyWorn.`;

const GARMENT_PROMPT = `Analyze this garment product photo. Return ONLY compact JSON (no markdown) with keys:
name, category (dress/top/bottom/outerwear/saree/suit/jumpsuit/other), colorPrimary, colorSecondary, pattern, fabric, neckline, sleeveStyle, length, fit (slim/regular/relaxed/oversized), formality (casual/smart/formal/black-tie), season, occasions (array), description (2 sentences).`;

async function analyzePerson(
  zai: Awaited<ReturnType<typeof ZAI.create>>,
  personDataUrl: string,
): Promise<PersonAnalysis> {
  const fallback: PersonAnalysis = {
    genderPresentation: 'unknown',
    ageBand: 'adult',
    ethnicityCues: 'unknown',
    skinTone: 'neutral medium',
    hairStyle: 'straight',
    hairColor: 'dark brown',
    bodyType: 'regular',
    heightBand: 'average',
    buildDescription: 'Average proportions with balanced shoulders, waist and hips and a relaxed, natural posture.',
    faceDescription: 'Oval face shape with balanced, harmonious features.',
    poseDescription: 'Standing relaxed facing the camera.',
    clothingCurrentlyWorn: 'everyday casual wear',
  };

  try {
    const res = await zai.chat.completions.createVision({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: PERSON_PROMPT },
            { type: 'image_url', image_url: { url: personDataUrl } },
          ],
        },
      ],
      thinking: { type: 'disabled' },
    });
    const text = res.choices?.[0]?.message?.content ?? '';
    return extractJson<PersonAnalysis>(text, fallback);
  } catch (err) {
    console.error('[ai-tryon] person analysis failed:', (err as Error).message);
    return fallback;
  }
}

async function analyzeGarment(
  zai: Awaited<ReturnType<typeof ZAI.create>>,
  garmentDataUrl: string,
): Promise<GarmentAnalysis> {
  const fallback: GarmentAnalysis = {
    name: 'Garment',
    category: 'other',
    colorPrimary: 'unknown',
    colorSecondary: '',
    pattern: 'solid',
    fabric: 'unknown',
    neckline: 'standard',
    sleeveStyle: 'standard',
    length: 'regular',
    fit: 'regular',
    formality: 'smart',
    season: 'all-season',
    occasions: ['Casual'],
    description: 'A versatile garment suitable for everyday wear. Clean, simple design.',
  };

  try {
    const res = await zai.chat.completions.createVision({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: GARMENT_PROMPT },
            { type: 'image_url', image_url: { url: garmentDataUrl } },
          ],
        },
      ],
      thinking: { type: 'disabled' },
    });
    const text = res.choices?.[0]?.message?.content ?? '';
    return extractJson<GarmentAnalysis>(text, fallback);
  } catch (err) {
    console.error('[ai-tryon] garment analysis failed:', (err as Error).message);
    return fallback;
  }
}

/* ------------------------------------------------------------------ */
/* Reasoning → StyleReport                                            */
/* ------------------------------------------------------------------ */

async function reasonStyleReport(
  zai: Awaited<ReturnType<typeof ZAI.create>>,
  person: PersonAnalysis,
  garment: GarmentAnalysis,
): Promise<StyleReport> {
  const fallback: StyleReport = {
    fitScore: 75,
    fitLabel: 'Flattering',
    sizeRecommendation: 'M (Medium)',
    colorHarmonyScore: 80,
    colorHarmonyLabel: 'Good',
    bodyType: person.bodyType || 'Regular',
    occasions: garment.occasions?.length ? garment.occasions : ['Casual'],
    flatteringNotes: [
      `The ${garment.colorPrimary} hue complements a ${person.skinTone} skin tone.`,
      `${garment.fit} fit works naturally with a ${person.bodyType} build.`,
    ],
    stylingTips: [
      'Pair with minimalist accessories to keep focus on the garment.',
      'Choose footwear in a neutral tone that matches the garment mood.',
      'Layer with a structured jacket for cooler weather.',
    ],
    summary: `This ${garment.colorPrimary.toLowerCase()} ${garment.category} suits a ${person.bodyType.toLowerCase()} build and ${person.skinTone.toLowerCase()} skin tone well. The ${garment.fit} fit creates a balanced, confident silhouette for ${garment.occasions?.[0]?.toLowerCase() || 'casual'} occasions.`,
  };

  const system = `You are FitMirror's senior fashion stylist AI. Given a structured analysis of a person and a garment, produce a StyleReport as COMPACT JSON ONLY (no markdown, no prose). Be realistic, specific and helpful. All scores are integers 0-100. Arrays contain 2-5 short strings. The report must include keys: fitScore, fitLabel, sizeRecommendation, colorHarmonyScore, colorHarmonyLabel, bodyType, occasions (array), flatteringNotes (array of 2-4 short strings), stylingTips (array of 3-5 strings), summary (2-3 sentences).`;

  const user = `PERSON ANALYSIS (JSON):
${JSON.stringify(person)}

GARMENT ANALYSIS (JSON):
${JSON.stringify(garment)}

Now produce the StyleReport JSON.`;

  try {
    const res = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      thinking: { type: 'disabled' },
    });
    const text = res.choices?.[0]?.message?.content ?? '';
    const parsed = extractJson<Partial<StyleReport>>(text, {});

    // Merge with fallback so missing keys never crash the UI
    return {
      fitScore: typeof parsed.fitScore === 'number' ? parsed.fitScore : fallback.fitScore,
      fitLabel: parsed.fitLabel || fallback.fitLabel,
      sizeRecommendation: parsed.sizeRecommendation || fallback.sizeRecommendation,
      colorHarmonyScore:
        typeof parsed.colorHarmonyScore === 'number'
          ? parsed.colorHarmonyScore
          : fallback.colorHarmonyScore,
      colorHarmonyLabel: parsed.colorHarmonyLabel || fallback.colorHarmonyLabel,
      bodyType: parsed.bodyType || fallback.bodyType,
      occasions:
        Array.isArray(parsed.occasions) && parsed.occasions.length
          ? parsed.occasions
          : fallback.occasions,
      flatteringNotes:
        Array.isArray(parsed.flatteringNotes) && parsed.flatteringNotes.length
          ? parsed.flatteringNotes
          : fallback.flatteringNotes,
      stylingTips:
        Array.isArray(parsed.stylingTips) && parsed.stylingTips.length
          ? parsed.stylingTips
          : fallback.stylingTips,
      summary: parsed.summary || fallback.summary,
    };
  } catch (err) {
    console.error('[ai-tryon] reasoning failed:', (err as Error).message);
    return fallback;
  }
}

/* ------------------------------------------------------------------ */
/* Image generation                                                  */
/* ------------------------------------------------------------------ */

function buildImagePrompt(person: PersonAnalysis, garment: GarmentAnalysis): string {
  const personDesc = [
    person.buildDescription,
    person.faceDescription,
    `${person.hairStyle} ${person.hairColor} hair`,
    `${person.skinTone} skin tone`,
    person.bodyType ? `${person.bodyType} build` : '',
    person.heightBand ? `${person.heightBand} height` : '',
    person.poseDescription,
  ]
    .filter(Boolean)
    .join(', ');

  const garmentDesc = [
    garment.description,
    `${garment.colorPrimary}${garment.colorSecondary ? ` with ${garment.colorSecondary} accents` : ''}`,
    garment.pattern ? `${garment.pattern} pattern` : '',
    garment.fabric ? `${garment.fabric} fabric` : '',
    garment.neckline ? `${garment.neckline} neckline` : '',
    garment.length ? `${garment.length} length` : '',
    garment.fit ? `${garment.fit} fit` : '',
    garment.sleeveStyle ? `${garment.sleeveStyle} sleeves` : '',
    garment.category,
  ]
    .filter(Boolean)
    .join(', ');

  return `Photorealistic full-body fashion photo of a person (${personDesc}) wearing ${garmentDesc}. Natural soft daylight, neutral studio backdrop, candid relaxed pose, sharp focus, high detail, editorial fashion photography, lifelike skin texture, realistic fabric drape and folds, true-to-life colors, no text, no watermark.`;
}

async function generateTryOnImage(
  zai: Awaited<ReturnType<typeof ZAI.create>>,
  prompt: string,
): Promise<string> {
  const attempt = async (): Promise<string> => {
    const res = await zai.images.generations.create({
      prompt,
      size: '768x1344',
    });
    const base64 = res?.data?.[0]?.base64;
    if (!base64) {
      throw new Error('Image generation returned no base64 payload');
    }
    return base64 as string;
  };

  try {
    return await attempt();
  } catch (err) {
    console.warn(
      '[ai-tryon] image gen first attempt failed, retrying once:',
      (err as Error).message,
    );
    try {
      return await attempt();
    } catch (err2) {
      throw new Error(
        `Image generation failed after retry: ${(err2 as Error).message}`,
      );
    }
  }
}

/* ------------------------------------------------------------------ */
/* Public pipeline                                                   */
/* ------------------------------------------------------------------ */

export async function runTryOn(opts: {
  personBuffer: Buffer;
  garmentBuffer: Buffer;
  variations?: number; // 1-4, default 1
}): Promise<{ report: StyleReport; resultImageBase64: string; variations: string[] }> {
  const zai = await ZAI.create();
  const n = Math.min(4, Math.max(1, opts.variations ?? 1));

  const personDataUrl = toDataUrl(opts.personBuffer, 'image/png');
  const garmentDataUrl = toDataUrl(opts.garmentBuffer, 'image/png');

  // Run the two VLM analyses in parallel
  const [person, garment] = await Promise.all([
    analyzePerson(zai, personDataUrl),
    analyzeGarment(zai, garmentDataUrl),
  ]);

  // Reason about style with the text LLM
  const report = await reasonStyleReport(zai, person, garment);

  // Generate the photorealistic try-on image(s).
  // For variations, we tweak the prompt slightly per variation (pose / mood)
  // and generate in parallel for speed.
  const prompt = buildImagePrompt(person, garment);
  const moodVariations = [
    '',
    ', candid relaxed pose, soft smile, hands in pockets',
    ', confident editorial pose, slight turn, looking away',
    ', playful walking pose, motion in fabric, natural laugh',
  ];
  const prompts = Array.from({ length: n }, (_, i) => prompt + (moodVariations[i] || ''));

  const results = await Promise.all(
    prompts.map((p) => generateTryOnImage(zai, p).catch(() => null)),
  );
  const valid = results.filter((r): r is string => !!r);
  if (valid.length === 0) {
    throw new Error('Image generation failed for all variations');
  }

  return { report, resultImageBase64: valid[0], variations: valid };
}
