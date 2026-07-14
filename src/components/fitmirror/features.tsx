'use client'

import {
  Ruler,
  Palette,
  Sparkles,
  Shirt,
  Heart,
  ShieldCheck,
  Zap,
  Repeat,
} from 'lucide-react'

const FEATURES = [
  {
    icon: Sparkles,
    title: 'Natural AI try-on',
    body: 'Photorealistic, editorial-style rendering tuned for lifelike fabric drape and skin tones — not a flat “AI sticker” look.',
  },
  {
    icon: Ruler,
    title: 'Fit & size intelligence',
    body: 'Get a flattering score and a recommended size based on your body type and the garment’s cut.',
  },
  {
    icon: Palette,
    title: 'Color harmony report',
    body: 'Does this color suit your skin tone? We score the palette match and suggest alternatives.',
  },
  {
    icon: Heart,
    title: 'Personal wardrobe',
    body: 'Save the looks you love with notes. Build a capsule wardrobe and revisit anytime.',
  },
  {
    icon: Repeat,
    title: 'Try-on history',
    body: 'Every preview is stored privately under your anonymous session — no login required.',
  },
  {
    icon: Zap,
    title: 'Fast & lightweight',
    body: 'Optimized pipeline returns results in seconds. 3 free try-ons every day, no card needed.',
  },
  {
    icon: Shirt,
    title: 'Any garment, anywhere',
    body: 'Dresses, sarees, suits, casuals — snap it in-store or upload a product photo from any site.',
  },
  {
    icon: ShieldCheck,
    title: 'Private by design',
    body: 'Your photos stay in your session. No social login, no spam, no selling your data. Ever.',
  },
]

export function Features() {
  return (
    <section id="features" className="border-b border-border/60">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand-soft px-3 py-1 text-xs font-medium text-brand-soft-foreground">
            <Sparkles className="h-3.5 w-3.5" /> What you get
          </span>
          <h2 className="font-display mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            A styling studio in your pocket
          </h2>
          <p className="mt-3 text-muted-foreground">
            Everything you need to shop smarter and waste fewer returns.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand text-brand-foreground shadow-sm transition-transform group-hover:scale-105">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
