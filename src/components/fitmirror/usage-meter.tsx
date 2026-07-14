'use client'

import { useQuery } from '@tanstack/react-query'
import { Zap, Lock } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { useFitMirror } from '@/lib/store'
import type { UsageDTO } from '@/lib/types'

export function UsageMeter() {
  const usageNonce = useFitMirror((s) => s.usageNonce)
  const setActiveTab = useFitMirror((s) => s.setActiveTab)
  const { data } = useQuery<UsageDTO>({
    queryKey: ['usage', usageNonce],
    queryFn: async () => {
      const r = await fetch('/api/usage')
      if (!r.ok) throw new Error('usage')
      return r.json()
    },
  })

  const used = data?.used ?? 0
  const limit = data?.limit ?? 3
  const remaining = data?.remaining ?? 3
  const pct = limit > 0 ? (used / limit) * 100 : 0
  const exhausted = remaining <= 0

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-3.5 py-2.5 shadow-sm">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-soft-foreground">
        {exhausted ? <Lock className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-medium">
            {exhausted ? 'Daily free limit reached' : 'Free try-ons today'}
          </span>
          <span className="tabular-nums text-muted-foreground">
            {used}/{limit} used
          </span>
        </div>
        <Progress value={pct} className="mt-1.5 h-1.5" />
      </div>
      {exhausted && (
        <button
          onClick={() => {
            const el = document.getElementById('pricing')
            if (el) el.scrollIntoView({ behavior: 'smooth' })
            else setActiveTab('studio')
          }}
          className="shrink-0 rounded-lg bg-brand px-2.5 py-1.5 text-xs font-semibold text-brand-foreground hover:bg-brand/90"
        >
          Upgrade
        </button>
      )}
    </div>
  )
}
