'use client'

import { create } from 'zustand'
import type { DiscoverItem, TryOnResult } from '@/lib/types'

export type TabKey = 'mirror' | 'studio' | 'wardrobe' | 'history' | 'discover'

interface FitMirrorState {
  activeTab: TabKey
  setActiveTab: (t: TabKey) => void

  /** A garment chosen from Discover to preload into the Studio. */
  pendingGarment: DiscoverItem | null
  setPendingGarment: (g: DiscoverItem | null) => void

  /** Bump this to force the usage meter to refetch after a try-on. */
  usageNonce: number
  bumpUsage: () => void

  /** Bump to force history/wardrobe refetch. */
  listNonce: number
  bumpLists: () => void

  // --- Persistent Studio state (survives tab switches) ---
  personImg: string | null
  setPersonImg: (v: string | null) => void
  garmentImg: string | null
  setGarmentImg: (v: string | null) => void
  garmentName: string
  setGarmentName: (v: string) => void
  result: TryOnResult | null
  setResult: (v: TryOnResult | null) => void
  saved: boolean
  setSaved: (v: boolean) => void

  // --- Magic Mirror step machine (persisted) ---
  mirrorStep:
    | 'intro'
    | 'person'
    | 'garment'
    | 'ready'
    | 'generating'
    | 'result'
  setMirrorStep: (v: FitMirrorState['mirrorStep']) => void
}

export const useFitMirror = create<FitMirrorState>((set) => ({
  activeTab: 'mirror',
  setActiveTab: (activeTab) => set({ activeTab }),
  pendingGarment: null,
  setPendingGarment: (pendingGarment) => set({ pendingGarment }),
  usageNonce: 0,
  bumpUsage: () => set((s) => ({ usageNonce: s.usageNonce + 1 })),
  listNonce: 0,
  bumpLists: () => set((s) => ({ listNonce: s.listNonce + 1 })),

  personImg: null,
  setPersonImg: (personImg) => set({ personImg }),
  garmentImg: null,
  setGarmentImg: (garmentImg) => set({ garmentImg }),
  garmentName: '',
  setGarmentName: (garmentName) => set({ garmentName }),
  result: null,
  setResult: (result) => set({ result }),
  saved: false,
  setSaved: (saved) => set({ saved }),

  mirrorStep: 'intro',
  setMirrorStep: (mirrorStep) => set({ mirrorStep }),
}))
