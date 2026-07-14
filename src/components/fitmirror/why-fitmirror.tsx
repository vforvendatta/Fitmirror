'use client'

import * as React from 'react'
import { motion, useInView, useMotionValue, animate } from 'framer-motion'
import {
  ScanFace,
  Sparkles,
  Gauge,
  ShieldCheck,
  Heart,
  Palette,
  Zap,
  Lock,
} from 'lucide-react'

const USPS = [
  {
    icon: ScanFace,
    tone: 'brand',
    title: 'A mirror, not a form',
    body: 'Open your camera and it auto-detects you and the outfit. No uploads, no cropping, no friction — just hold it up and watch.',
  },
  {
    icon: Sparkles,
    tone: 'peach',
    title: 'Natural, not AI-stickers',
    body: 'Editorial photorealistic rendering with real fabric drape, lifelike skin tones and true lighting. Looks like a photo, not a filter.',
  },
  {
    icon: Gauge,
    tone: 'mint',
    title: 'A stylist in 10 seconds',
    body: 'Every try-on ships with fit, size, color-harmony and styling intelligence — the kind of note you’d get from a personal shopper.',
  },
  {
    icon: ShieldCheck,
    tone: 'lavender',
    title: 'Private by default',
    body: 'Anonymous browser session, no sign-up, no social login. Your photos never leave your session. Delete everything in one tap.',
  },
]

const STATS = [
  { icon: Zap, value: 10, suffix: 's', label: 'avg. try-on time' },
  { icon: Heart, value: 0, suffix: '', label: 'sign-ups required' },
  { icon: Lock, value: 100, suffix: '%', label: 'private to you' },
  { icon: Palette, value: 3, suffix: '', label: 'free try-ons / day' },
]

const TONES: Record<string, string> = {
  brand: 'bg-brand-soft text-brand-soft-foreground',
  peach: 'bg-peach text-peach-foreground',
  mint: 'bg-mint text-mint-foreground',
  lavender: 'bg-lavender text-lavender-foreground',
}

function Counter({ to, suffix }: { to: number; suffix: string }) {
  const ref = React.useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const mv = useMotionValue(0)
  React.useEffect(() => {
    if (!inView) return
    const controls = animate(mv, to, {
      duration: 1.1,
      ease: 'easeOut',
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = Math.round(v) + suffix
      },
    })
    return () => controls.stop()
  }, [inView, to, suffix, mv])
  return <span ref={ref}>0{suffix}</span>
}

export function WhyFitMirror() {
  return (
    <section id="why" className="border-b border-border/60">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand-soft px-3 py-1 text-xs font-medium text-brand-soft-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Why FitMirror
          </span>
          <h2 className="font-display mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            The friendliest way to try before you buy
          </h2>
          <p className="mt-3 text-muted-foreground">
            Built around one belief: trying clothes should feel like play, not
            paperwork.
          </p>
        </div>

        {/* USP cards */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {USPS.map((u, i) => (
            <motion.div
              key={u.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="relative rounded-3xl border border-border/60 bg-card p-5 fm-shadow"
            >
              <div
                className={
                  'grid h-12 w-12 place-items-center rounded-2xl ' +
                  (TONES[u.tone] || TONES.brand)
                }
              >
                <u.icon className="h-6 w-6" />
              </div>
              <h3 className="font-display mt-4 text-lg font-semibold">
                {u.title}
              </h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{u.body}</p>
            </motion.div>
          ))}
        </div>

        {/* Stat band */}
        <div className="mt-10 grid grid-cols-2 gap-3 rounded-3xl border border-border/60 bg-gradient-to-br from-brand-soft via-peach/40 to-mint/30 p-6 sm:grid-cols-4 fm-shadow">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="mx-auto mb-2 grid h-9 w-9 place-items-center rounded-xl bg-background/80 text-brand">
                <s.icon className="h-4 w-4" />
              </div>
              <div className="font-display text-3xl font-bold tabular-nums text-foreground sm:text-4xl">
                <Counter to={s.value} suffix={s.suffix} />
              </div>
              <div className="mt-1 text-xs font-medium text-muted-foreground">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
