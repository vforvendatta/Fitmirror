'use client'

import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Camera,
  Upload,
  X,
  Wand2,
  Loader2,
  Download,
  Heart,
  RefreshCw,
  Shirt,
  User,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CameraDialog } from './camera-dialog'
import { ReportCard } from './report-card'
import { UsageMeter } from './usage-meter'
import { useFitMirror } from '@/lib/store'
import type { TryOnResult, DiscoverItem } from '@/lib/types'

type Slot = 'person' | 'garment'

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(fr.result as string)
    fr.onerror = reject
    fr.readAsDataURL(file)
  })
}

export function Studio() {
  const qc = useQueryClient()
  const pendingGarment = useFitMirror((s) => s.pendingGarment)
  const setPendingGarment = useFitMirror((s) => s.setPendingGarment)
  const bumpUsage = useFitMirror((s) => s.bumpUsage)
  const bumpLists = useFitMirror((s) => s.bumpLists)

  // Persistent Studio state (survives tab switches)
  const personImg = useFitMirror((s) => s.personImg)
  const setPersonImg = useFitMirror((s) => s.setPersonImg)
  const garmentImg = useFitMirror((s) => s.garmentImg)
  const setGarmentImg = useFitMirror((s) => s.setGarmentImg)
  const garmentName = useFitMirror((s) => s.garmentName)
  const setGarmentName = useFitMirror((s) => s.setGarmentName)
  const result = useFitMirror((s) => s.result)
  const setResult = useFitMirror((s) => s.setResult)
  const saved = useFitMirror((s) => s.saved)
  const setSaved = useFitMirror((s) => s.setSaved)

  // Transient local state
  const [camFor, setCamFor] = React.useState<Slot | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [saveName, setSaveName] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  // Preload garment from Discover
  React.useEffect(() => {
    if (pendingGarment) {
      setGarmentImg(pendingGarment.imageUrl)
      setGarmentName(pendingGarment.name)
      setResult(null)
      setSaved(false)
      setPendingGarment(null)
    }
  }, [pendingGarment, setPendingGarment])

  const onFile = async (slot: Slot, file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Image is too large (max 8MB).')
      return
    }
    const url = await fileToDataUrl(file)
    if (slot === 'person') setPersonImg(url)
    else {
      setGarmentImg(url)
      setGarmentName((n) => n || file.name.replace(/\.[^.]+$/, ''))
    }
    setResult(null)
    setSaved(false)
  }

  const clearSlot = (slot: Slot) => {
    if (slot === 'person') setPersonImg(null)
    else {
      setGarmentImg(null)
      setGarmentName('')
    }
    setResult(null)
    setSaved(false)
  }

  const generate = async () => {
    if (!personImg) {
      toast.error('Add your photo first.')
      return
    }
    if (!garmentImg) {
      toast.error('Add a garment first.')
      return
    }
    setLoading(true)
    setResult(null)
    setSaved(false)
    try {
      const res = await fetch('/api/tryon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personImage: personImg,
          garmentImage: garmentImg,
          garmentName: garmentName || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 402) {
          toast.error('Daily free limit reached. Upgrade for more try-ons.')
          bumpUsage()
        } else {
          toast.error(data?.error || 'Try-on failed. Please try again.')
        }
        return
      }
      setResult(data as TryOnResult)
      bumpUsage()
      bumpLists()
      toast.success('Your try-on is ready!')
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const download = async () => {
    if (!result) return
    try {
      const r = await fetch(result.resultImageUrl)
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fitmirror-${result.tryOnId}.png`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Could not download image.')
    }
  }

  const share = async () => {
    if (!result) return
    const text = 'Check out my AI try-on look on FitMirror!'
    try {
      if (navigator.share) {
        await navigator.share({ title: 'FitMirror look', text })
      } else {
        await navigator.clipboard.writeText(text + ' ' + window.location.href)
        toast.success('Link copied to clipboard.')
      }
    } catch {
      /* user cancelled */
    }
  }

  const saveToWardrobe = async () => {
    if (!result) return
    setSaving(true)
    try {
      const res = await fetch('/api/wardrobe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tryOnId: result.tryOnId,
          name: saveName.trim() || garmentName || 'Untitled look',
          notes: '',
        }),
      })
      if (!res.ok) throw new Error()
      setSaved(true)
      bumpLists()
      qc.invalidateQueries({ queryKey: ['wardrobe'] })
      toast.success('Saved to your wardrobe.')
    } catch {
      toast.error('Could not save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  const resetAll = () => {
    setResult(null)
    setSaved(false)
    setSaveName('')
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      {/* LEFT: inputs */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Try-On Studio</h2>
            <p className="text-sm text-muted-foreground">
              Add your photo and a garment, then generate.
            </p>
          </div>
          <Badge variant="secondary" className="hidden sm:inline-flex">
            <Sparkles className="mr-1 h-3 w-3" /> AI
          </Badge>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <UploadTile
            slot="person"
            label="Your photo"
            icon={User}
            hint="Full-body, good light"
            image={personImg}
            onFile={(f) => onFile('person', f)}
            onCamera={() => setCamFor('person')}
            onClear={() => clearSlot('person')}
          />
          <UploadTile
            slot="garment"
            label="Garment"
            icon={Shirt}
            hint="Snap or pick from Discover"
            image={garmentImg}
            name={garmentName}
            onFile={(f) => onFile('garment', f)}
            onCamera={() => setCamFor('garment')}
            onClear={() => clearSlot('garment')}
          />
        </div>

        <div className="mt-4">
          <Label htmlFor="gn" className="text-xs text-muted-foreground">
            Label this look (optional)
          </Label>
          <Input
            id="gn"
            value={garmentName}
            onChange={(e) => setGarmentName(e.target.value)}
            placeholder="e.g. Emerald evening gown"
            className="mt-1"
          />
        </div>

        <div className="mt-4">
          <UsageMeter />
        </div>

        <Button
          size="lg"
          className="mt-4 w-full bg-brand text-brand-foreground hover:bg-brand/90"
          disabled={loading || !personImg || !garmentImg}
          onClick={generate}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-4 w-4" /> Generate Try-On
            </>
          )}
        </Button>

        {loading && <LoadingSteps />}

        <p className="mt-3 text-center text-xs text-muted-foreground">
          Previews are AI-rendered approximations. Always verify fit &amp; fabric
          before purchasing.
        </p>
      </Card>

      {/* RIGHT: result */}
      <Card className="flex flex-col p-5">
        <h2 className="text-lg font-semibold">Preview</h2>
        {!result && !loading && (
          <div className="mt-2 flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/30 p-8 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand-soft-foreground">
              <Sparkles className="h-7 w-7" />
            </div>
            <p className="mt-4 text-sm font-medium">Your look appears here</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add both photos and tap Generate.
            </p>
          </div>
        )}

        {loading && (
          <div className="mt-2 flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/30 p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-brand" />
            <p className="mt-3 text-sm font-medium">Rendering your try-on…</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Analyzing body type, garment &amp; colors. ~10–20s.
            </p>
          </div>
        )}

        {result && !loading && (
          <div className="mt-3 flex flex-1 flex-col gap-4">
            <div className="relative overflow-hidden rounded-xl border border-border/60 bg-muted/30">
              <img
                src={result.resultImageUrl}
                alt="AI try-on result"
                className="h-full w-full object-contain"
              />
              <Badge className="absolute left-2 top-2 bg-brand text-brand-foreground">
                AI Preview
              </Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={download}
                variant="outline"
              >
                <Download className="mr-1.5 h-4 w-4" /> Download
              </Button>
              <Button size="sm" onClick={share} variant="outline">
                Share
              </Button>
              <Button
                size="sm"
                onClick={resetAll}
                variant="outline"
              >
                <RefreshCw className="mr-1.5 h-4 w-4" /> New look
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder={
                  garmentName ? `Save as “${garmentName}”` : 'Name this look'
                }
              />
              <Button
                size="sm"
                onClick={saveToWardrobe}
                disabled={saving || saved}
                className="bg-brand text-brand-foreground hover:bg-brand/90"
              >
                {saved ? (
                  <>
                    <Heart className="mr-1.5 h-4 w-4 fill-current" /> Saved
                  </>
                ) : (
                  <>
                    <Heart className="mr-1.5 h-4 w-4" /> Save
                  </>
                )}
              </Button>
            </div>

            <ReportCard report={result.report} />
          </div>
        )}
      </Card>

      <CameraDialog
        open={camFor !== null}
        onOpenChange={(o) => !o && setCamFor(null)}
        onCapture={(url) => {
          if (camFor === 'person') setPersonImg(url)
          else {
            setGarmentImg(url)
            setGarmentName((n) => n || 'Captured garment')
          }
          setResult(null)
          setSaved(false)
        }}
        title={camFor === 'person' ? 'Take your photo' : 'Snap the garment'}
      />
    </div>
  )
}

function UploadTile(props: {
  slot: Slot
  label: string
  icon: React.ComponentType<{ className?: string }>
  hint: string
  image: string | null
  name?: string
  onFile: (f?: File) => void
  onCamera: () => void
  onClear: () => void
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const isPath = props.image?.startsWith('/discover/')
  return (
    <div className="group relative">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-border/70 bg-muted/30">
        {props.image ? (
          <img
            src={props.image}
            alt={props.label}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-4 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-soft text-brand-soft-foreground">
              <props.icon className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-medium">{props.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{props.hint}</p>
          </div>
        )}

        {props.image && (
          <button
            onClick={props.onClear}
            aria-label={`Clear ${props.label}`}
            className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-background/90 text-foreground shadow hover:bg-background"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {props.image && props.name && (
          <div className="absolute bottom-0 left-0 right-0 truncate bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 text-xs font-medium text-white">
            {props.name}
          </div>
        )}
        {isPath && (
          <Badge className="absolute left-2 top-2" variant="secondary">
            Discover
          </Badge>
        )}
      </div>

      <div className="mt-2 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="mr-1.5 h-4 w-4" /> Upload
        </Button>
        <Button variant="outline" size="sm" className="flex-1" onClick={props.onCamera}>
          <Camera className="mr-1.5 h-4 w-4" /> Camera
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => props.onFile(e.target.files?.[0])}
      />
    </div>
  )
}

function LoadingSteps() {
  const steps = [
    'Analyzing your body type & pose',
    'Reading the garment details',
    'Reasoning fit, size & color',
    'Rendering your natural try-on',
  ]
  const [active, setActive] = React.useState(0)
  React.useEffect(() => {
    if (active >= steps.length) return
    const t = setTimeout(() => setActive((a) => a + 1), 2200)
    return () => clearTimeout(t)
  }, [active, steps.length])
  return (
    <ul className="mt-4 space-y-2">
      {steps.map((s, i) => (
        <li
          key={s}
          className="flex items-center gap-2 text-xs text-muted-foreground"
        >
          {i < active ? (
            <Loader2 className="h-3.5 w-3.5 text-brand" />
          ) : i === active ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" />
          ) : (
            <span className="h-3.5 w-3.5 rounded-full border border-border" />
          )}
          <span className={i <= active ? 'text-foreground' : ''}>{s}</span>
        </li>
      ))}
    </ul>
  )
}
