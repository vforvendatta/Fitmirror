import { NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

// Lightweight VLM frame verifier — powers the Magic Mirror's
// "auto-identify" feel. One call per captured frame (NOT per live frame).
// Body: { image: dataURL, expect: 'person' | 'garment' }
// Returns: { ok: boolean, message: string, description: string }

let zaiPromise: Promise<any> | null = null
async function getZai() {
  if (!zaiPromise) zaiPromise = ZAI.create()
  return zaiPromise
}

function extractJson(text: string): { ok: boolean; description: string } {
  const fallback = { ok: true, description: 'looks good' }
  if (!text) return fallback
  let t = text.trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) t = fence[1].trim()
  const first = t.indexOf('{')
  const last = t.lastIndexOf('}')
  if (first !== -1 && last !== -1 && last > first) {
    try {
      return JSON.parse(t.slice(first, last + 1))
    } catch {
      /* fall through */
    }
  }
  // boolean-ish fallback: if the text contains "yes"/"no"
  const lower = text.toLowerCase()
  if (/\bno\b|cannot|doesn|does not|not visible|empty/.test(lower)) {
    return { ok: false, description: text.slice(0, 80) }
  }
  return fallback
}

export async function POST(request: Request) {
  try {
    const { image, expect } = await request.json()
    if (typeof image !== 'string' || !image.startsWith('data:image/')) {
      return NextResponse.json(
        { error: 'image must be a data URL' },
        { status: 400 }
      )
    }
    const target = expect === 'garment' ? 'a clothing garment / dress / outfit item' : 'a full-body person'

    const zai = await getZai()
    const prompt = `Look at this photo. Does it clearly show ${target}?
Answer with ONLY compact JSON (no markdown), keys: "ok" (boolean true/false) and "description" (what you see, max 12 words, friendly tone).
Example: {"ok":true,"description":"a young woman standing in a bright room"}`

    const response = await zai.chat.completions.createVision({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: image } },
          ],
        },
      ],
      thinking: { type: 'disabled' },
    })

    const content = response.choices?.[0]?.message?.content ?? ''
    const parsed = extractJson(content)
    const message =
      expect === 'garment'
        ? parsed.ok
          ? `Got it — I can see your outfit!`
          : `Hmm, I couldn't spot a garment. Hold it up and try again.`
        : parsed.ok
        ? `I can see you!`
        : `I can't quite see you — step into the frame and try again.`

    return NextResponse.json({
      ok: !!parsed.ok,
      message,
      description: parsed.description || '',
    })
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: true,
        message: 'Skipping check — please continue.',
        description: '',
        error: e?.message || 'detect failed',
      },
      { status: 200 }
    )
  }
}
