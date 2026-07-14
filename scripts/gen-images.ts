import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'
import path from 'path'

const OUT = '/home/z/my-project/public'
fs.mkdirSync(path.join(OUT, 'discover'), { recursive: true })

const JOBS: { file: string; prompt: string; size: string }[] = [
  { file: 'discover/dress-1.png', size: '768x1344', prompt: 'Product photo of an elegant emerald green silk evening gown, floor length v-neck, on invisible mannequin, studio lighting, pure white background, high fashion catalog, photorealistic, no text' },
  { file: 'discover/dress-2.png', size: '768x1344', prompt: 'Product photo of a floral summer midi dress, pastel pink flowers on cream fabric, short sleeves, on invisible mannequin, studio lighting, pure white background, fashion catalog, photorealistic, no text' },
  { file: 'discover/dress-3.png', size: '768x1344', prompt: 'Product photo of a classic black cocktail dress, knee length, off shoulder, on invisible mannequin, studio lighting, pure white background, high fashion catalog, photorealistic, no text' },
  { file: 'discover/dress-4.png', size: '768x1344', prompt: 'Product photo of a blue denim jacket over a white t-shirt outfit, on invisible mannequin, studio lighting, pure white background, fashion catalog, photorealistic, no text' },
  { file: 'hero.png', size: '1440x720', prompt: 'Fashion editorial split scene, left side a young woman holding a floral dress on a wooden hanger in a bright boutique, right side the same woman wearing the dress naturally and smiling, warm natural sunlight, photorealistic lifestyle, shallow depth of field, no text, no watermark' },
]

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function genOne(zai: any, j: { file: string; prompt: string; size: string }) {
  const target = path.join(OUT, j.file)
  if (fs.existsSync(target) && fs.statSync(target).size > 5000) {
    console.log('SKIP (exists)', j.file)
    return
  }
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const r = await zai.images.generations.create({ prompt: j.prompt, size: j.size as any })
      const b64 = r.data[0].base64
      fs.writeFileSync(target, Buffer.from(b64, 'base64'))
      console.log('OK', j.file)
      return
    } catch (e: any) {
      const msg = String(e?.message || e)
      console.log(`FAIL(${attempt})`, j.file, msg.slice(0, 80))
      if (msg.includes('429')) {
        await sleep(15000 * attempt)
        continue
      }
      await sleep(3000)
    }
  }
  console.log('GIVEUP', j.file)
}

async function main() {
  const zai = await ZAI.create()
  for (const j of JOBS) {
    await genOne(zai, j)
    await sleep(4000)
  }
  console.log('DONE')
}
main().catch((e) => { console.error(e); process.exit(1) })
