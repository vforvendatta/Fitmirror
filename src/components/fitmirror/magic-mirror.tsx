'use client'

import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Camera,
  CameraOff,
  RefreshCw,
  Wand2,
  Loader2,
  Sparkles,
  Check,
  X,
  Upload,
  Shirt,
  User,
  Download,
  Heart,
  Share2,
  RotateCcw,
  ScanFace,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ReportCard } from './report-card'
import { UsageMeter } from './usage-meter'
import { useFitMirror } from '@/lib/store'
import type { TryOnResult, DiscoverItem } from '@/lib/types'

type Step = 'intro' | 'person' | 'garment' | 'ready' | 'generating' | 'result'
type CamStatus = 'idle' | 'starting' | 'live' | 'denied' | 'unsupported'

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(fr.result as string)
    fr.onerror = reject
    fr.readAsDataURL(file)
  })
}

export function MagicMirror() {
  const qc = useQueryClient()
  const pendingGarment = useFitMirror((s) => s.pendingGarment)
  const setPendingGarment = useFitMirror((s) => s.setPendingGarment)
  const bumpUsage = useFitMirror((s) => s.bumpUsage)
  const bumpLists = useFitMirror((s) => s.bumpLists)

  // Shared (persisted) state — survives tab switches
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
  const step = useFitMirror((s) => s.mirrorStep)
  const setStep = useFitMirror((s) => s.setMirrorStep)

  // Transient local state
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const streamRef = React.useRef<MediaStream | null>(null)

  const [cam, setCam] = React.useState<CamStatus>('idle')
  const [countdown, setCountdown] = React.useState<number | null>(null)
  const [verifying, setVerifying] = React.useState(false)
  const [verifyMsg, setVerifyMsg] = React.useState<string>('')
  const [loading, setLoading] = React.useState(false)
  const [saveName, setSaveName] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  // start/stop camera based on step
  const stopCam = React.useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const startCam = React.useCallback(async () => {
    setCam('starting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 1280 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      setCam('live')
    } catch (e: any) {
      if (e?.name === 'NotAllowedError' || e?.name === 'SecurityError') setCam('denied')
      else setCam('unsupported')
    }
  }, [])

  // cleanup on unmount
  React.useEffect(() => () => stopCam(), [stopCam])

  // Auto-restart camera when returning to a camera step (e.g. after a tab switch)
  React.useEffect(() => {
    if ((step === 'person' || step === 'garment') && cam === 'idle') {
      startCam()
    }
  }, [step])

  // Preload garment from Discover → skip straight to "ready" (if we have a person)
  React.useEffect(() => {
    if (pendingGarment) {
      setGarmentImg(pendingGarment.imageUrl)
      setGarmentName(pendingGarment.name)
      // If we already have a person, jump to ready; otherwise go to person step.
      setStep(personImg ? 'ready' : 'person')
      setPendingGarment(null)
    }
  }, [pendingGarment, setPendingGarment, setGarmentImg, setGarmentName, setStep, personImg])

  const captureFrame = (): string | null => {
    const v = videoRef.current
    if (!v || !v.videoWidth) return null
    const canvas = document.createElement('canvas')
    const w = v.videoWidth
    const h = v.videoHeight
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.translate(w, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(v, 0, 0, w, h)
    return canvas.toDataURL('image/jpeg', 0.92)
  }

  const runCountdown = (from: number) =>
    new Promise<void>((resolve) => {
      let n = from
      setCountdown(n)
      const id = setInterval(() => {
        n -= 1
        if (n <= 0) {
          clearInterval(id)
          setCountdown(null)
          resolve()
        } else {
          setCountdown(n)
        }
      }, 1000)
    })

  const detect = async (img: string, expect: 'person' | 'garment') => {
    setVerifying(true)
    setVerifyMsg('')
    try {
      const r = await fetch('/api/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: img, expect }),
      })
      const data = await r.json()
      return { ok: data.ok !== false, message: data.message as string }
    } catch {
      return { ok: true, message: '' }
    } finally {
      setVerifying(false)
    }
  }

  // Auto-snap a frame after a countdown, verify with VLM, advance or retry.
  const snapStep = async (which: 'person' | 'garment') => {
    if (cam !== 'live') return
    await runCountdown(3)
    const img = captureFrame()
    if (!img) {
      toast.error('Could not capture. Try again.')
      return
    }
    const { ok, message } = await detect(img, which)
    setVerifyMsg(message)
    if (ok) {
      if (which === 'person') {
        setPersonImg(img)
        setStep('garment')
      } else {
        setGarmentImg(img)
        setStep('ready')
      }
    } else {
      // friendly retry: brief shake via toast, stay on same step
      toast(message || 'Try again', { icon: '🤔' })
    }
  }

  const beginMirror = async () => {
    setStep('person')
    await startCam()
  }

  const generate = async () => {
    if (!personImg || !garmentImg) {
      toast.error('Add both your photo and a garment first.')
      return
    }
    setStep('generating')
    setLoading(true)
    stopCam()
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
          setStep('ready')
        } else {
          toast.error(data?.error || 'Try-on failed. Please try again.')
          setStep('ready')
        }
        return
      }
      setResult(data as TryOnResult)
      setSaved(false)
      setStep('result')
      bumpUsage()
      bumpLists()
      toast.success('Your try-on is ready! ✨')
    } catch {
      toast.error('Network error. Please try again.')
      setStep('ready')
    } finally {
      setLoading(false)
    }
  }

  const resetAll = () => {
    setPersonImg(null)
    setGarmentImg(null)
    setGarmentName('')
    setResult(null)
    setSaved(false)
    setVerifyMsg('')
    setStep('intro')
    setCam('idle')
    stopCam()
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
    const text = 'Check out my AI try-on look on FitMirror! ✨'
    try {
      if (navigator.share) await navigator.share({ title: 'FitMirror look', text })
      else {
        await navigator.clipboard.writeText(text + ' ' + window.location.href)
        toast.success('Link copied to clipboard.')
      }
    } catch {
      /* cancelled */
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

  return (
    <Card className="overflow-hidden p-0 fm-shadow-lg">
      {/* Mirror surface — the camera/result lives here */}
      <div className="relative aspect-[3/4] w-full bg-neutral-900 sm:aspect-[4/3] md:aspect-[16/10]">
        {/* live video (mirrored selfie) */}
        <video
          ref={videoRef}
          playsInline
          muted
          className={
            'absolute inset-0 h-full w-full object-cover transition-opacity ' +
            (cam === 'live' && step !== 'result' && step !== 'generating'
              ? 'opacity-100'
              : 'opacity-0')
          }
          style={{ transform: 'scaleX(-1)' }}
        />

        {/* Intro screen */}
        {step === 'intro' && (
          <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-brand/30 via-peach/20 to-mint/20 p-6 text-center">
            <div className="max-w-sm">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 16 }}
                className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-background/90 fm-shadow"
              >
                <ScanFace className="h-10 w-10 text-brand" />
              </motion.div>
              <h3 className="mt-5 text-2xl font-bold text-foreground">
                Your Magic Mirror
              </h3>
              <p className="mt-2 text-sm text-foreground/80">
                Stand in front of your camera, hold up any outfit, and watch
                yourself wear it — instantly. No uploads, no fuss. ✨
              </p>
              <Button
                size="lg"
                onClick={beginMirror}
                className="mt-6 bg-brand text-brand-foreground hover:bg-brand/90 fm-shadow"
              >
                <Sparkles className="mr-2 h-5 w-5" /> Open the mirror
              </Button>
              <button
                onClick={() => useFitMirror.getState().setActiveTab('studio')}
                className="mt-3 block w-full text-xs text-foreground/70 underline-offset-2 hover:underline"
              >
                Or upload a photo instead
              </button>
            </div>
          </div>
        )}

        {/* Generating overlay */}
        {step === 'generating' && (
          <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-brand/30 via-lavender/20 to-mint/20 p-6 text-center">
            <div className="max-w-sm">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-brand" />
              <h3 className="mt-4 text-xl font-bold">Making your magic…</h3>
              <p className="mt-1 text-sm text-foreground/80">
                Analyzing your look &amp; rendering the outfit. ~10–20s.
              </p>
            </div>
          </div>
        )}

        {/* Result overlay */}
        {step === 'result' && result && (
          <div className="absolute inset-0">
            <img
              src={result.resultImageUrl}
              alt="AI try-on result"
              className="h-full w-full object-cover"
            />
            <div className="absolute left-3 top-3 flex gap-2">
              <Badge className="bg-brand text-brand-foreground">
                <Sparkles className="mr-1 h-3 w-3" /> Your look
              </Badge>
            </div>
          </div>
        )}

        {/* Framing guide + step UI when camera live and not generating/result */}
        {cam === 'live' && (step === 'person' || step === 'garment') && (
          <>
            {/* framing brackets */}
            {step === 'person' && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="h-[78%] w-[62%] rounded-[40%] border-2 border-dashed border-white/70" />
              </div>
            )}
            {step === 'garment' && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="h-[60%] w-[55%] rounded-3xl border-2 border-dashed border-white/70" />
              </div>
            )}

            {/* top step pill */}
            <div className="absolute left-1/2 top-4 -translate-x-1/2">
              <Badge className="bg-background/90 px-3 py-1.5 text-foreground shadow">
                {step === 'person' ? (
                  <>
                    <User className="mr-1.5 h-3.5 w-3.5 text-brand" /> Step 1 · You
                  </>
                ) : (
                  <>
                    <Shirt className="mr-1.5 h-3.5 w-3.5 text-brand" /> Step 2 · Your outfit
                  </>
                )}
              </Badge>
            </div>

            {/* step dots */}
            <div className="absolute right-3 top-4 flex gap-1.5">
              {['person', 'garment', 'ready'].map((s, i) => (
                <span
                  key={s}
                  className={
                    'h-2 w-2 rounded-full ' +
                    ((step === 'person' && i === 0) ||
                    (step === 'garment' && i === 1)
                      ? 'bg-brand'
                      : 'bg-white/50')
                  }
                />
              ))}
            </div>

            {/* countdown number */}
            <AnimatePresence>
              {countdown !== null && (
                <motion.div
                  key={countdown}
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.6, opacity: 0 }}
                  className="pointer-events-none absolute inset-0 grid place-items-center"
                >
                  <span className="text-8xl font-black text-white drop-shadow-lg">
                    {countdown === 0 ? '✨' : countdown}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* verify message */}
            {verifying && (
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="flex items-center gap-2 rounded-full bg-background/90 px-4 py-2 text-sm font-medium shadow">
                  <Loader2 className="h-4 w-4 animate-spin text-brand" /> Checking…
                </div>
              </div>
            )}
            {!verifying && verifyMsg && (
              <div className="absolute left-1/2 top-[64%] -translate-x-1/2">
                <div className="rounded-full bg-background/90 px-4 py-1.5 text-xs font-medium text-foreground shadow">
                  {verifyMsg}
                </div>
              </div>
            )}

            {/* bottom controls */}
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3">
              <Button
                onClick={() => snapStep(step)}
                disabled={countdown !== null || verifying}
                className="rounded-full bg-brand px-6 text-brand-foreground hover:bg-brand/90 fm-shadow"
                size="lg"
              >
                <Camera className="mr-2 h-5 w-5" />
                {countdown !== null ? 'Smile…' : verifying ? 'Checking…' : 'Snap ✨'}
              </Button>
            </div>
            {personImg && step === 'garment' && (
              <div className="absolute bottom-4 left-4 h-16 w-12 overflow-hidden rounded-lg border-2 border-white/80 shadow">
                <img src={personImg} alt="you" className="h-full w-full object-cover" />
              </div>
            )}
          </>
        )}

        {/* Camera blocked / unsupported — step-aware upload fallback */}
        {(cam === 'denied' || cam === 'unsupported') &&
          (step === 'person' || step === 'garment') && (
            <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-brand/15 via-peach/15 to-mint/15 p-6 text-center">
              <div className="max-w-sm">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-background/90 fm-shadow">
                  {step === 'person' ? (
                    <User className="h-7 w-7 text-brand" />
                  ) : (
                    <Shirt className="h-7 w-7 text-brand" />
                  )}
                </div>
                <h3 className="mt-3 text-lg font-semibold">
                  {step === 'person'
                    ? 'Add your photo'
                    : 'Add the outfit'}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {step === 'person'
                    ? "No camera? No problem. Upload a full-body photo and we'll do the rest."
                    : 'Upload a garment photo, or pick one from Discover below.'}
                </p>
                <MirrorFallbackUpload
                  label={step === 'person' ? 'your photo' : 'the garment'}
                  onPick={async (f) => {
                    const url = await fileToDataUrl(f)
                    if (step === 'person') {
                      setPersonImg(url)
                      setStep('garment')
                    } else {
                      setGarmentImg(url)
                      setGarmentName(f.name.replace(/\.[^.]+$/, ''))
                      setStep('ready')
                    }
                  }}
                />
                {step === 'garment' && (
                  <button
                    onClick={() => useFitMirror.getState().setActiveTab('discover')}
                    className="mt-3 block w-full text-xs text-foreground/70 underline-offset-2 hover:underline"
                  >
                    or pick from the Discover gallery →
                  </button>
                )}
                {personImg && step === 'garment' && (
                  <div className="mt-3 inline-block h-16 w-12 overflow-hidden rounded-lg border-2 border-brand/60 shadow">
                    <img src={personImg} alt="you" className="h-full w-full object-cover" />
                  </div>
                )}
              </div>
            </div>
          )}
      </div>

      {/* Below-mirror controls / status */}
      <div className="space-y-4 p-5">
        <UsageMeter />

        {/* Ready state: thumbnails + generate */}
        {step === 'ready' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <ReadyThumb
                label="You"
                icon={User}
                img={personImg}
                onRetake={() => {
                  setPersonImg(null)
                  setStep('person')
                  startCam()
                }}
              />
              <ReadyThumb
                label="Outfit"
                icon={Shirt}
                img={garmentImg}
                isPath={garmentImg?.startsWith('/discover/')}
                onRetake={() => {
                  setGarmentImg(null)
                  setGarmentName('')
                  setStep('garment')
                  startCam()
                }}
              />
            </div>
            <Input
              value={garmentName}
              onChange={(e) => setGarmentName(e.target.value)}
              placeholder="Name this look (optional)"
            />
            <Button
              size="lg"
              onClick={generate}
              disabled={loading || !personImg || !garmentImg}
              className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
            >
              <Wand2 className="mr-2 h-5 w-5" /> Try it on ✨
            </Button>
            <button
              onClick={resetAll}
              className="block w-full text-center text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              Start over
            </button>
          </div>
        )}

        {/* Result actions + report */}
        {step === 'result' && result && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={download} variant="outline">
                <Download className="mr-1.5 h-4 w-4" /> Download
              </Button>
              <Button size="sm" onClick={share} variant="outline">
                <Share2 className="mr-1.5 h-4 w-4" /> Share
              </Button>
              <Button size="sm" onClick={resetAll} variant="outline">
                <RotateCcw className="mr-1.5 h-4 w-4" /> New look
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
      </div>
    </Card>
  )
}

function ReadyThumb(props: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  img: string | null
  isPath?: boolean
  onRetake: () => void
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border/60 bg-muted/40">
      <div className="relative aspect-[3/4] w-full">
        {props.img ? (
          <img
            src={props.img}
            alt={props.label}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full place-items-center text-muted-foreground">
            <props.icon className="h-8 w-8" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
          <span className="text-xs font-medium text-white">{props.label}</span>
          <button
            onClick={props.onRetake}
            className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-foreground hover:bg-white"
          >
            Retake
          </button>
        </div>
        {props.isPath && (
          <Badge className="absolute left-1.5 top-1.5" variant="secondary">
            Discover
          </Badge>
        )}
      </div>
    </div>
  )
}

function MirrorFallbackUpload({
  label,
  onPick,
}: {
  label: string
  onPick: (f: File) => void
}) {
  const ref = React.useRef<HTMLInputElement>(null)
  return (
    <div className="mt-4">
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onPick(f)
        }}
      />
      <Button onClick={() => ref.current?.click()} className="bg-brand text-brand-foreground hover:bg-brand/90">
        <Upload className="mr-2 h-4 w-4" /> Upload {label}
      </Button>
    </div>
  )
}
