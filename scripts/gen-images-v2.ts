import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'
import path from 'path'

const OUT = '/home/z/my-project/public'
fs.mkdirSync(path.join(OUT, 'discover'), { recursive: true })
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const JOBS: { file: string; prompt: string; size: string }[] = [
  // 8 discover garments — natural, editorial, premium product photography
  { file: 'discover/dress-1.png', size: '768x1344', prompt: 'Premium fashion product photograph of an elegant emerald green silk evening gown, floor length, v-neck, displayed on an invisible mannequin, soft studio lighting, pure white seamless background, high-end catalog, photorealistic, fine fabric detail, no text, no watermark' },
  { file: 'discover/dress-2.png', size: '768x1344', prompt: 'Premium fashion product photograph of a floral summer midi dress, delicate pastel pink flowers on cream fabric, short puff sleeves, on invisible mannequin, soft natural light, pure white background, high-end catalog, photorealistic, no text' },
  { file: 'discover/dress-3.png', size: '768x1344', prompt: 'Premium fashion product photograph of a classic little black cocktail dress, knee length, off-shoulder, on invisible mannequin, soft studio lighting, pure white background, high-end fashion catalog, photorealistic, satin texture, no text' },
  { file: 'discover/dress-4.png', size: '768x1344', prompt: 'Premium fashion product photograph of a blue denim jacket layered over a crisp white t-shirt, on invisible mannequin, soft studio lighting, pure white background, high-end catalog, photorealistic, denim texture detail, no text' },
  { file: 'discover/dress-5.png', size: '768x1344', prompt: 'Premium fashion product photograph of a red silk saree with intricate gold zari border, elegantly draped on a mannequin, soft studio lighting, pure white background, indian high-fashion catalog, photorealistic, no text' },
  { file: 'discover/dress-6.png', size: '768x1344', prompt: 'Premium fashion product photograph of a white linen button-up shirt and beige tailored trousers set, on invisible mannequin, soft daylight, pure white background, minimalist high-end catalog, photorealistic, natural fabric texture, no text' },
  { file: 'discover/dress-7.png', size: '768x1344', prompt: 'Premium fashion product photograph of a burgundy velvet wrap dress, midi length, long sleeves, on invisible mannequin, soft studio lighting, pure white background, high-end autumn fashion catalog, photorealistic, plush velvet texture, no text' },
  { file: 'discover/dress-8.png', size: '768x1344', prompt: 'Premium fashion product photograph of a pastel lavender chiffon midi dress with delicate pleats, on invisible mannequin, soft dreamy lighting, pure white background, high-end spring fashion catalog, photorealistic, airy fabric, no text' },
  // Hero — editorial split
  { file: 'hero.png', size: '1344x768', prompt: 'Fashion editorial photograph split into two halves: left half a young woman holding a floral dress on a wooden hanger in a sunlit boutique, right half the same woman wearing the dress naturally and smiling warmly, soft golden natural light, photorealistic lifestyle, shallow depth of field, premium magazine aesthetic, no text, no watermark' },
  // USP lifestyle examples
  { file: 'usp-1.png', size: '1024x1024', prompt: 'Close-up of a young woman smiling while looking into a phone held up like a mirror, soft pastel boutique background, warm natural light, photorealistic lifestyle, joyful friendly mood, no text' },
  { file: 'usp-2.png', size: '1024x1024', prompt: 'Flat lay of fashion accessories — sunglasses, silk scarf, gold earrings, lipstick — on a cream marble surface with soft pastel pink and peach tones, top-down, photorealistic, premium aesthetic, no text' },
]

async function main() {
  const zai = await ZAI.create()
  for (const j of JOBS) {
    const target = path.join(OUT, j.file)
    // skip if already a good size (so reruns don't burn quota)
    if (fs.existsSync(target) && fs.statSync(target).size > 30000) {
      console.log('SKIP', j.file); continue
    }
    for (let a = 1; a <= 5; a++) {
      try {
        const r = await zai.images.generations.create({ prompt: j.prompt, size: j.size as any })
        fs.writeFileSync(target, Buffer.from(r.data[0].base64, 'base64'))
        console.log('OK', j.file); break
      } catch (e: any) {
        console.log(`FAIL(${a})`, j.file, String(e?.message || e).slice(0, 80))
        await sleep(12000 * a)
      }
    }
    await sleep(4000)
  }
  console.log('DONE')
}
main().catch((e) => { console.error(e); process.exit(1) })
