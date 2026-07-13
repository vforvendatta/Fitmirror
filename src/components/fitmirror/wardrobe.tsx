'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Heart, Trash2, Loader2, Shirt } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useFitMirror } from '@/lib/store'
import type { WardrobeItemDTO } from '@/lib/types'

export function Wardrobe() {
  const listNonce = useFitMirror((s) => s.listNonce)
  const qc = useQueryClient()
  const { data, isLoading } = useQuery<WardrobeItemDTO[]>({
    queryKey: ['wardrobe', listNonce],
    queryFn: async () => {
      const r = await fetch('/api/wardrobe')
      if (!r.ok) throw new Error('wardrobe')
      return r.json()
    },
  })

  const remove = async (id: string) => {
    const prev = data
    qc.setQueryData<WardrobeItemDTO[]>(['wardrobe', listNonce], (old) =>
      (old ?? []).filter((w) => w.id !== id)
    )
    try {
      const r = await fetch(`/api/wardrobe?id=${id}`, { method: 'DELETE' })
      if (!r.ok) throw new Error()
      toast.success('Removed from wardrobe.')
    } catch {
      qc.setQueryData(['wardrobe', listNonce], prev)
      toast.error('Could not remove. Try again.')
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Your Wardrobe</h2>
          <p className="text-sm text-muted-foreground">
            Saved looks, organized and ready to revisit.
          </p>
        </div>
        {data && data.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {data.length} {data.length === 1 ? 'look' : 'looks'}
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
            <Shirt className="h-7 w-7" />
          </div>
          <p className="mt-4 text-sm font-medium">Your wardrobe is empty</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Generate a try-on and tap Save to start collecting looks.
          </p>
        </div>
      )}

      {data && data.length > 0 && (
        <div className="mt-5 grid max-h-[640px] grid-cols-2 gap-4 overflow-y-auto pr-1 sm:grid-cols-3 fm-scroll">
          {data.map((w) => (
            <div
              key={w.id}
              className="group overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm"
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted/40">
                {w.resultImageUrl ? (
                  <img
                    src={w.resultImageUrl}
                    alt={w.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-muted-foreground">
                    <Shirt className="h-8 w-8" />
                  </div>
                )}
                <button
                  onClick={() => remove(w.id)}
                  aria-label="Remove"
                  className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-background/90 text-rose-600 shadow opacity-0 transition-opacity hover:bg-background group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <span className="absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-brand/90 text-brand-foreground">
                  <Heart className="h-3 w-3 fill-current" />
                </span>
              </div>
              <div className="p-2.5">
                <p className="truncate text-xs font-medium">{w.name}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {new Date(w.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
