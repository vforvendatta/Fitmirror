'use client'

import * as React from 'react'
import Link from 'next/link'
import { Sparkles, Moon, Sun, Github } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { useFitMirror, type TabKey } from '@/lib/store'

const NAV: { key: TabKey; label: string }[] = [
  { key: 'mirror', label: 'Mirror' },
  { key: 'discover', label: 'Discover' },
  { key: 'wardrobe', label: 'Wardrobe' },
  { key: 'history', label: 'History' },
  { key: 'admin', label: 'Admin' },
]

export function SiteHeader() {
  const { activeTab, setActiveTab } = useFitMirror()
  const { setTheme, theme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <button
          onClick={() => setActiveTab('mirror')}
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-brand-foreground shadow-sm">
            <Sparkles className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-semibold">
            Fit<span className="text-brand">Mirror</span>
          </span>
        </button>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <button
              key={n.key}
              onClick={() => setActiveTab(n.key)}
              data-active={activeTab === n.key}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[active=true]:bg-brand-soft data-[active=true]:text-brand-soft-foreground"
            >
              {n.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {mounted && theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
          <Button
            asChild
            variant="ghost"
            size="icon"
            aria-label="GitHub"
            className="hidden sm:inline-flex"
          >
            <Link href="#pricing">
              <Github className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            size="sm"
            className="bg-brand text-brand-foreground hover:bg-brand/90"
            onClick={() => setActiveTab('mirror')}
          >
            Try Free
          </Button>
        </div>
      </div>

      {/* mobile tab bar */}
      <nav className="flex items-center gap-1 overflow-x-auto border-t border-border/60 px-2 py-1.5 md:hidden fm-scroll">
        {NAV.map((n) => (
          <button
            key={n.key}
            onClick={() => setActiveTab(n.key)}
            data-active={activeTab === n.key}
            className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[active=true]:bg-brand-soft data-[active=true]:text-brand-soft-foreground"
          >
            {n.label}
          </button>
        ))}
      </nav>
    </header>
  )
}
