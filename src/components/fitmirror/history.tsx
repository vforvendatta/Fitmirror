'use client'

import { useQuery } from '@tanstack/react-query'
import { History, Loader2, Clock } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useFitMirror } from '@/lib/store'
import type { HistoryDTO } from '@/lib/types'

export function HistoryPanel() {
  const listNonce = useFitMirror((s) => s.listNonce)
  const { data, isLoading } = useQuery<HistoryDTO[]>({
    queryKey: ['history', listNonce],
    queryFn: async () => {
      const r = await fetch('/api/history')
      if (!r.ok) throw new Error('history')
      return r.json()
    },
  })

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">History</h2>
          <p className="text-sm text-muted-foreground">
            Your recent try-ons this session.
          </p>
        </div>
        {data && data.length > 0 && (
          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> last 30
          </span>
        )}
      </div>

      {isLoading && (
        <div className="mt-6 grid place-items-center py-12 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}

      {data && data.length === 0 && (
        <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/30 py-14 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand-soft-foreground">
            <History className="h-7 w-7" />
          </div>
          <p className="mt-4 text-sm font-medium">No try-ons yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Your generated looks will show up here automatically.
          </p>
        </div>
      )}

      {data && data.length > 0 && (
        <div className="mt-5 grid max-h-[640px] grid-cols-2 gap-4 overflow-y-auto pr-1 sm:grid-cols-3 fm-scroll">
          {data.map((h) => (
            <div
              key={h.id}
              className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm"
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted/40">
                {h.resultImageUrl ? (
                  <img
                    src={h.resultImageUrl}
                    alt={h.garmentName || 'Try-on'}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-muted-foreground">
                    <History className="h-8 w-8" />
                  </div>
                )}
                {h.report && (
                  <div className="absolute right-2 top-2">
                    <Badge className="bg-brand text-brand-foreground">
                      {h.report.fitScore}
                    </Badge>
                  </div>
                )}
              </div>
              <div className="p-2.5">
                <p className="truncate text-xs font-medium">
                  {h.garmentName || 'Untitled look'}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {new Date(h.createdAt).toLocaleString()}
                </p>
                {h.report && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {h.report.occasions.slice(0, 2).map((o) => (
                      <Badge key={o} variant="outline" className="capitalize text-[10px]">
                        {o}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
