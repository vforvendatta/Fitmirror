import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'
import path from 'path'

const OUT = '/home/z/my-project/public'
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const JOBS = [
  { file: 'discover/dress-8.png', size: '768x1344', prompt: 'Premium fashion product photograph of a pastel lavender chiffon midi dress with delicate pleats, on invisible mannequin, soft dreamy lighting, pure white background, high-end spring fashion catalog, photorealistic, airy fabric, no text' },
  { file: 'hero.png', size: '1344x768', prompt: 'Fashion editorial photograph split into two halves: left half a young woman holding a floral dress on a wooden hanger in a sunlit boutique, right half the same woman wearing the dress naturally and smiling warmly, soft golden natural light, photorealistic lifestyle, shallow depth of field, premium magazine aesthetic, no text, no watermark' },
  { file: 'usp-1.png', size: '1024x1024', prompt: 'Close-up of a young woman smiling while looking into a phone held up like a mirror, soft pastel boutique background, warm natural light, photorealistic lifestyle, joyful friendly mood, no text' },
  { file: 'usp-2.png', size: '1024x1024', prompt: 'Flat lay of fashion accessories — sunglasses, silk scarf, gold earrings, lipstick — on a cream marble surface with soft pastel pink and peach tones, top-down, photorealistic, premium aesthetic, no text' },
]

async function main() {
  const zai = await ZAI.create()
  for (const j of JOBS) {
    const target = path.join(OUT, j.file)
    if (fs.existsSync(target) && fs.statSync(target).size > 20000) { console.log('SKIP', j.file); continue }
    for (let a = 1; a <= 5; a++) {
      try {
        const r = await zai.images.generations.create({ prompt: j.prompt, size: j.size as any })
        fs.writeFileSync(target, Buffer.from(r.data[0].base64, 'base64'))
        console.log('OK', j.file); break
      } catch (e: any) {
        console.log(`FAIL(${a})`, j.file, String(e?.message || e).slice(0, 80))
        await sleep(14000 * a)
      }
    }
    await sleep(4000)
  }
  console.log('DONE')
}
main().catch((e) => { console.error(e); process.exit(1) })
