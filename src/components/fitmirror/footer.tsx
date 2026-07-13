'use client'

import { Sparkles, Heart } from 'lucide-react'

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-background">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-brand-foreground shadow-sm">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display font-semibold tracking-tight">
                Fit<span className="text-brand">Mirror</span>
              </p>
              <p className="text-xs text-muted-foreground">
                AI Virtual Try-On Studio
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm sm:grid-cols-3">
            <a className="text-muted-foreground transition-colors hover:text-foreground" href="#how">How it works</a>
            <a className="text-muted-foreground transition-colors hover:text-foreground" href="#features">Features</a>
            <a className="text-muted-foreground transition-colors hover:text-foreground" href="#pricing">Pricing</a>
          </div>

          <div className="text-xs text-muted-foreground md:text-right">
            <p>Previews are AI-rendered approximations.</p>
            <p>Always check fit & fabric in person before buying.</p>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} FitMirror. All rights reserved.</p>
          <p className="inline-flex items-center gap-1">
            Built with <Heart className="h-3.5 w-3.5 text-brand" /> using Next.js &amp; Z.ai
          </p>
        </div>
      </div>
    </footer>
  )
}
