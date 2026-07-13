'use client'

import * as React from 'react'
import { Camera, RefreshCw, Check, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  onCapture: (dataUrl: string) => void
  title?: string
}

export function CameraDialog({ open, onOpenChange, onCapture, title }: Props) {
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const streamRef = React.useRef<MediaStream | null>(null)
  const [shot, setShot] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [ready, setReady] = React.useState(false)

  const stop = React.useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setReady(false)
  }, [])

  const start = React.useCallback(async () => {
    setError(null)
    setShot(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1080 }, height: { ideal: 1620 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      setReady(true)
    } catch {
      setError(
        'Camera access was blocked or is unavailable. You can upload a photo instead.'
      )
    }
  }, [])

  React.useEffect(() => {
    if (open) start()
    else stop()
    return stop
  }, [open, start, stop])

  const capture = () => {
    const v = videoRef.current
    const c = canvasRef.current
    if (!v || !c) return
    const w = v.videoWidth || 720
    const h = v.videoHeight || 1080
    c.width = w
    c.height = h
    const ctx = c.getContext('2d')
    if (!ctx) return
    // un-mirror for a natural selfie
    ctx.translate(w, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(v, 0, 0, w, h)
    const url = c.toDataURL('image/jpeg', 0.92)
    setShot(url)
    stop()
  }

  const retake = () => {
    setShot(null)
    start()
  }

  const confirm = () => {
    if (shot) onCapture(shot)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-brand" />
            {title ?? 'Take a photo'}
          </DialogTitle>
        </DialogHeader>

        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-black">
          {!shot && (
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-full w-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
          )}
          {shot && (
            <img
              src={shot}
              alt="Captured"
              className="h-full w-full object-cover"
            />
          )}
          <canvas ref={canvasRef} className="hidden" />

          {!ready && !shot && !error && (
            <div className="absolute inset-0 grid place-items-center text-sm text-white/80">
              Starting camera…
            </div>
          )}
          {error && (
            <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-white/90">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {!shot ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                <X className="mr-1.5 h-4 w-4" /> Cancel
              </Button>
              <Button
                onClick={capture}
                disabled={!ready}
                className="bg-brand text-brand-foreground hover:bg-brand/90"
              >
                <Camera className="mr-1.5 h-4 w-4" /> Capture
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={retake}>
                <RefreshCw className="mr-1.5 h-4 w-4" /> Retake
              </Button>
              <Button
                onClick={confirm}
                className="bg-brand text-brand-foreground hover:bg-brand/90"
              >
                <Check className="mr-1.5 h-4 w-4" /> Use photo
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
