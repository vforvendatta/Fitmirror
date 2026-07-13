'use client'

import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Shirt, Sparkles, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useFitMirror } from '@/lib/store'
import type { DiscoverItem } from '@/lib/types'

export function Discover() {
  const { setActiveTab, setPendingGarment } = useFitMirror()
  const { data, isLoading } = useQuery<DiscoverItem[]>({
    queryKey: ['discover'],
    queryFn: async () => {
      const r = await fetch('/api/discover')
      if (!r.ok) throw new Error('discover')
      return r.json()
    },
  })

  const pick = (g: DiscoverItem) => {
    setPendingGarment(g)
    setActiveTab('mirror')
    toast.success(`Loaded "${g.name}" into the mirror.`)
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Discover</h2>
          <p className="text-sm text-muted-foreground">
            Tap any garment to load it straight into the Studio.
          </p>
        </div>
        <Badge variant="secondary" className="hidden sm:inline-flex">
          <Sparkles className="mr-1 h-3 w-3" /> Curated
        </Badge>
      </div>

      {isLoading && (
        <div className="mt-6 grid place-items-center py-12 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}

      {data && data.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {data.map((g) => (
            <button
              key={g.id}
              onClick={() => pick(g)}
              className="group overflow-hidden rounded-xl border border-border/60 bg-card text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted/40">
                <img
                  src={g.imageUrl}
                  alt={g.name}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <Badge className="absolute left-2 top-2" variant="secondary">
                  {g.category}
                </Badge>
                <span className="absolute bottom-2 left-2 right-2 translate-y-2 text-xs font-medium text-white opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
                  Try this on →
                </span>
              </div>
              <div className="flex items-center gap-1.5 p-2.5">
                <Shirt className="h-3.5 w-3.5 shrink-0 text-brand" />
                <span className="truncate text-xs font-medium">{g.name}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {data && data.length === 0 && (
        <p className="mt-6 py-8 text-center text-sm text-muted-foreground">
          No garments available right now.
        </p>
      )}
    </Card>
  )
}
