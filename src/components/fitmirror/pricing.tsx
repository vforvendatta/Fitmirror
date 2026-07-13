'use client'

import { Check, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useFitMirror } from '@/lib/store'

const TIERS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    tagline: 'Try it out, no card needed.',
    cta: 'Start free',
    highlight: false,
    features: [
      '3 try-ons / day',
      'AI style report',
      'Try-on history (30 days)',
      'Camera & upload',
      'Discover gallery',
    ],
  },
  {
    name: 'Pro',
    price: '$9.99',
    period: 'per month',
    tagline: 'For the everyday shopper.',
    cta: 'Go Pro',
    highlight: true,
    features: [
      '50 try-ons / day',
      'HD previews (1344px)',
      'Unlimited wardrobe & history',
      'Color & fit deep-dive',
      'Download & share looks',
      'Priority rendering',
    ],
  },
  {
    name: 'Premium',
    price: '$19.99',
    period: 'per month',
    tagline: 'For stylists & resellers.',
    cta: 'Go Premium',
    highlight: false,
    features: [
      'Unlimited try-ons',
      'Batch try-on (multi-garment)',
      'Brand lookbooks',
      'API access',
      'Commercial usage license',
      'Dedicated support',
    ],
  },
]

export function Pricing() {
  const { setActiveTab } = useFitMirror()
  return (
    <section id="pricing" className="border-b border-border/60 bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand-soft px-3 py-1 text-xs font-medium text-brand-soft-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Simple pricing
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Start free. Upgrade when you love it.
          </h2>
          <p className="mt-3 text-muted-foreground">
            No credit card to begin. Generous free tier, cancel anytime.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {TIERS.map((t) => (
            <Card
              key={t.name}
              className={
                'relative flex flex-col p-6 ' +
                (t.highlight
                  ? 'border-brand shadow-lg ring-1 ring-brand/40'
                  : 'shadow-sm')
              }
            >
              {t.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-brand-foreground shadow">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-semibold">{t.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t.tagline}</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight">
                  {t.price}
                </span>
                <span className="text-sm text-muted-foreground">
                  /{t.period}
                </span>
              </div>

              <ul className="mt-5 space-y-2.5 text-sm">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="mt-6 w-full"
                variant={t.highlight ? 'default' : 'outline'}
                onClick={() => setActiveTab('studio')}
                data-highlight={t.highlight}
              >
                {t.highlight ? (
                  <span className="bg-brand text-brand-foreground">{t.cta}</span>
                ) : (
                  t.cta
                )}
              </Button>
            </Card>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Prices shown for illustration. Free tier is fully usable today — your
          daily quota resets at midnight UTC.
        </p>
      </div>
    </section>
  )
}
