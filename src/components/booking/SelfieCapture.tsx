import { useEffect, useRef, useState } from 'react'
import { Camera, RefreshCw, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Phase = 'idle' | 'starting' | 'live' | 'denied' | 'captured'

/**
 * Live selfie using the device camera, with a face guide and scanning animation.
 * If camera permission is denied or unavailable, offers a photo upload instead.
 * The image never leaves the browser in this demo and is discarded after the check.
 */
export function SelfieCapture({ scanning, onCapture }: { scanning: boolean; onCapture: (source: 'camera' | 'upload', preview: string) => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState('')

  const stop = () => {
    stream.current?.getTracks().forEach((t) => t.stop())
    stream.current = null
  }
  useEffect(() => stop, [])

  const start = async () => {
    setError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setPhase('denied')
      setError('This browser can’t open the camera. Upload a clear photo of your face instead.')
      return
    }
    setPhase('starting')
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } }, audio: false })
      stream.current = s
      setPhase('live')
      requestAnimationFrame(() => {
        if (video.current) {
          video.current.srcObject = s
          video.current.play().catch(() => undefined)
        }
      })
    } catch {
      setPhase('denied')
      setError('Camera permission was blocked. You can allow it in your browser settings, or upload a photo instead.')
    }
  }

  const capture = () => {
    const v = video.current
    if (!v) return
    const c = document.createElement('canvas')
    const size = Math.min(v.videoWidth, v.videoHeight) || 480
    c.width = c.height = 480
    const ctx = c.getContext('2d')!
    ctx.translate(480, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(v, (v.videoWidth - size) / 2, (v.videoHeight - size) / 2, size, size, 0, 0, 480, 480)
    const url = c.toDataURL('image/jpeg', 0.8)
    stop()
    setPreview(url)
    setPhase('captured')
    onCapture('camera', url)
  }

  const upload = (f: File | undefined) => {
    if (!f) return
    if (!f.type.startsWith('image/')) {
      setError('Choose an image file (JPG or PNG).')
      return
    }
    const url = URL.createObjectURL(f)
    setPreview(url)
    setPhase('captured')
    onCapture('upload', url)
  }

  const retake = () => {
    setPreview(null)
    setPhase('idle')
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className={cn('relative aspect-square w-full max-w-[300px] overflow-hidden rounded-full border-2 bg-ink-3', scanning ? 'border-accent' : 'border-line-strong')}>
        {phase === 'live' && <video ref={video} playsInline muted className="h-full w-full scale-x-[-1] object-cover" aria-label="Camera preview" />}
        {preview && <img src={preview} alt="Your selfie" className="h-full w-full object-cover" />}
        {(phase === 'idle' || phase === 'starting' || phase === 'denied') && !preview && (
          <div className="grid h-full place-items-center p-8 text-center text-[14px] text-mute">
            <Camera className="mb-2 size-8" />
            {phase === 'starting' ? 'Opening camera…' : 'Your face goes here'}
          </div>
        )}
        {/* Face guide */}
        {phase === 'live' && <div className="pointer-events-none absolute inset-[14%] rounded-[50%] border-2 border-dashed border-accent/70" aria-hidden />}
        {/* Scanning line */}
        {scanning && (
          <>
            <div className="pointer-events-none absolute inset-x-0 h-0.5 bg-accent shadow-[0_0_18px_4px_var(--brand-accent)] animate-[scan_1.6s_ease-in-out_infinite]" aria-hidden />
            <div className="pointer-events-none absolute inset-0 bg-accent/10" aria-hidden />
          </>
        )}
      </div>
      {error ? <p role="alert" className="max-w-sm text-center text-[13.5px] text-warn">{error}</p> : null}
      <div className="flex flex-wrap justify-center gap-2">
        {phase === 'live' && (
          <Button type="button" onClick={capture} icon={<Camera className="size-4" />}>
            Take selfie
          </Button>
        )}
        {(phase === 'idle' || phase === 'denied') && (
          <Button type="button" onClick={start} variant={phase === 'denied' ? 'ghost' : 'primary'} icon={<Camera className="size-4" />}>
            {phase === 'denied' ? 'Try camera again' : 'Open camera'}
          </Button>
        )}
        {phase === 'captured' && !scanning && (
          <Button type="button" variant="ghost" onClick={retake} icon={<RefreshCw className="size-4" />}>
            Retake
          </Button>
        )}
        {phase !== 'captured' && (
          <label className="roll-host label inline-flex h-11 cursor-pointer items-center gap-2 border border-line-strong px-5 hover:border-paper">
            <Upload className="size-4" /> Upload photo
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
          </label>
        )}
      </div>
    </div>
  )
}
