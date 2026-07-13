'use client'

import { Camera, Shirt, Wand2, Download } from 'lucide-react'

const STEPS = [
  {
    icon: Shirt,
    title: 'Add the garment',
    body: 'Snap a photo of any dress in a store, or pick one from our Discover gallery. A product photo works too.',
  },
  {
    icon: Camera,
    title: 'Add your photo',
    body: 'Upload a full-body shot or capture one live with your camera. Good lighting & a clear pose work best.',
  },
  {
    icon: Wand2,
    title: 'Generate the try-on',
    body: 'Our AI analyzes your body type, skin tone & the garment — then renders a natural-looking preview in seconds.',
  },
  {
    icon: Download,
    title: 'Read the report & save',
    body: 'Get fit, size, color-harmony & styling tips. Save looks to your wardrobe or download the preview.',
  },
]

export function HowItWorks() {
  return (
    <section id="how" className="border-b border-border/60 bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            How FitMirror works
          </h2>
          <p className="mt-3 text-muted-foreground">
            Four simple steps from a hanger to a preview of you wearing it.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className="relative rounded-2xl border border-border/60 bg-card p-5 shadow-sm"
            >
              <span className="absolute right-4 top-4 text-5xl font-bold text-brand/10">
                {i + 1}
              </span>
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand-soft-foreground">
                <s.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
