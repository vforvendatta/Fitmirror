'use client'

import { motion, AnimatePresence } from 'framer-motion'
import {
  ScanFace,
  Shirt,
  Heart,
  History as HistoryIcon,
  Sparkles,
  Upload,
} from 'lucide-react'
import { QueryProvider } from '@/components/query-provider'
import { SiteHeader } from '@/components/fitmirror/site-header'
import { Hero } from '@/components/fitmirror/hero'
import { HowItWorks } from '@/components/fitmirror/how-it-works'
import { Features } from '@/components/fitmirror/features'
import { Pricing } from '@/components/fitmirror/pricing'
import { Footer } from '@/components/fitmirror/footer'
import { MagicMirror } from '@/components/fitmirror/magic-mirror'
import { Studio } from '@/components/fitmirror/studio'
import { Discover } from '@/components/fitmirror/discover'
import { Wardrobe } from '@/components/fitmirror/wardrobe'
import { HistoryPanel } from '@/components/fitmirror/history'
import { useFitMirror, type TabKey } from '@/lib/store'

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'mirror', label: 'Mirror', icon: ScanFace },
  { key: 'discover', label: 'Discover', icon: Shirt },
  { key: 'wardrobe', label: 'Wardrobe', icon: Heart },
  { key: 'history', label: 'History', icon: HistoryIcon },
  { key: 'studio', label: 'Upload', icon: Upload },
]

function AppShell() {
  const { activeTab, setActiveTab } = useFitMirror()
  return (
    <section className="border-b border-border/60 bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
        <div className="mx-auto mb-6 flex max-w-xl items-center gap-1 rounded-2xl border border-border/60 bg-card p-1 fm-shadow">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              data-active={activeTab === t.key}
              className="relative flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[active=true]:text-brand-soft-foreground"
            >
              {activeTab === t.key && (
                <motion.span
                  layoutId="tab-pill"
                  className="absolute inset-0 rounded-xl bg-brand-soft"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <t.icon className="relative h-4 w-4" />
              <span className="relative hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'mirror' && <MagicMirror />}
            {activeTab === 'studio' && <Studio />}
            {activeTab === 'discover' && <Discover />}
            {activeTab === 'wardrobe' && <Wardrobe />}
            {activeTab === 'history' && <HistoryPanel />}
          </motion.div>
        </AnimatePresence>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-brand" />
          Private to your browser session — no sign-up required.
        </p>
      </div>
    </section>
  )
}

export default function Home() {
  return (
    <QueryProvider>
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1">
          <Hero />
          <AppShell />
          <HowItWorks />
          <Features />
          <Pricing />
        </main>
        <Footer />
      </div>
    </QueryProvider>
  )
}
