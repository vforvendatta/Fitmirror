'use client'

import { motion } from 'framer-motion'
import { Sparkles, ScanFace, Shirt, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFitMirror } from '@/lib/store'

export function Hero() {
  const { setActiveTab } = useFitMirror()
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div className="absolute inset-0 -z-10 fm-grid-bg opacity-50" />
      <div className="absolute -top-24 right-0 -z-10 h-72 w-72 rounded-full bg-brand/20 blur-3xl" />
      <div className="absolute -bottom-24 left-0 -z-10 h-72 w-72 rounded-full bg-mint/30 blur-3xl" />
      <div className="absolute top-1/3 left-1/2 -z-10 h-60 w-60 -translate-x-1/2 rounded-full bg-peach/30 blur-3xl" />

      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand-soft px-3 py-1 text-xs font-medium text-brand-soft-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Live Magic Mirror · Free to start
          </span>
          <h1 className="font-display mt-5 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
            Open the mirror. Hold up a dress.{' '}
            <span className="text-brand italic">See it on you, live.</span>
          </h1>
          <p className="mt-5 max-w-md text-base text-muted-foreground sm:text-lg">
            No uploads, no forms. Just your camera — it recognizes you, recognizes
            the outfit, and shows you wearing it. Plus an instant AI style report.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              className="bg-brand text-brand-foreground hover:bg-brand/90 fm-shadow"
              onClick={() => setActiveTab('mirror')}
            >
              <ScanFace className="mr-2 h-5 w-5" /> Open the Mirror
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setActiveTab('discover')}
            >
              <Shirt className="mr-2 h-4 w-4" /> Browse Looks
            </Button>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Wand2 className="h-4 w-4 text-brand" /> 3 free try-ons / day
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-brand" /> No sign-up needed
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ScanFace className="h-4 w-4 text-brand" /> Auto-detects you &amp; the outfit
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="relative"
        >
          <div className="relative mx-auto aspect-[16/10] w-full max-w-md overflow-hidden rounded-3xl border border-border/70 bg-card fm-shadow-lg md:max-w-lg">
            <img
              src="/hero.png"
              alt="FitMirror try-on preview: a garment on a hanger and the same person wearing it"
              className="h-full w-full object-cover"
              onError={(e) => {
                ;(e.target as HTMLImageElement).style.display = 'none'
              }}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
              <span className="rounded-xl bg-background/90 px-2.5 py-1 text-xs font-medium shadow">
                Hold up → See it on
              </span>
              <span className="rounded-xl bg-brand px-2.5 py-1 text-xs font-semibold text-brand-foreground shadow">
                ✨ AI Preview
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
