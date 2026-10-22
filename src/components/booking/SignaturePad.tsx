import { useEffect, useRef, useState } from 'react'
import { Eraser } from 'lucide-react'

/** Draw-your-signature pad (pointer events: mouse, pen and touch). */
export function SignaturePad({ onChange }: { onChange: (dataUrl: string | undefined) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)
  const [empty, setEmpty] = useState(true)
  const inked = useRef(false)

  useEffect(() => {
    const c = canvas.current!
    const fit = () => {
      const r = c.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      c.width = r.width * dpr
      c.height = r.height * dpr
      const ctx = c.getContext('2d')!
      ctx.scale(dpr, dpr)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--brand-paper') || '#f2efe8'
      ctx.lineWidth = 2.4
    }
    fit()
    return undefined
  }, [])

  const pos = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const down = (e: React.PointerEvent) => {
    e.preventDefault()
    canvas.current!.setPointerCapture(e.pointerId)
    drawing.current = true
    last.current = pos(e)
  }
  const move = (e: React.PointerEvent) => {
    if (!drawing.current || !last.current) return
    const p = pos(e)
    const ctx = canvas.current!.getContext('2d')!
    ctx.lineWidth = e.pressure && e.pointerType === 'pen' ? 1 + e.pressure * 3 : 2.4
    ctx.beginPath()
    ctx.moveTo(last.current.x, last.current.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    last.current = p
    if (!inked.current) {
      inked.current = true
      setEmpty(false)
    }
  }
  const up = () => {
    if (!drawing.current) return
    drawing.current = false
    last.current = null
    if (inked.current) onChange(canvas.current!.toDataURL('image/png'))
  }
  const clear = () => {
    const c = canvas.current!
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height)
    inked.current = false
    setEmpty(true)
    onChange(undefined)
  }

  return (
    <div>
      <div className="relative border border-line-strong bg-ink-3">
        <canvas
          ref={canvas}
          className="block h-40 w-full touch-none cursor-crosshair"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerLeave={up}
          aria-label="Signature area. Draw your signature with mouse, finger or pen."
          role="img"
        />
        {empty && <p className="pointer-events-none absolute inset-0 grid place-items-center text-[14px] text-mute">Sign here</p>}
        <div className="pointer-events-none absolute inset-x-6 bottom-8 border-b border-dashed border-line-strong" aria-hidden />
      </div>
      <button type="button" onClick={clear} className="label mt-2 inline-flex items-center gap-1.5 text-mute hover:text-paper">
        <Eraser className="size-3.5" /> Clear
      </button>
    </div>
  )
}
