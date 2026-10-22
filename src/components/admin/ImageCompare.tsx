import { useRef, useState, type ReactNode } from 'react'
import { MoveHorizontal } from 'lucide-react'

/** Before/after slider. Drag the handle (or use arrow keys) to compare. `overlay` renders on the "after" side. */
export function ImageCompare({ before, after, overlay, labelBefore = 'Check-out', labelAfter = 'Check-in', afterFilter }: { before: string; after: string; overlay?: ReactNode; labelBefore?: string; labelAfter?: string; afterFilter?: string }) {
  const [pos, setPos] = useState(50)
  const box = useRef<HTMLDivElement>(null)
  const drag = useRef(false)
  const set = (clientX: number) => {
    const r = box.current!.getBoundingClientRect()
    setPos(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)))
  }
  return (
    <div
      ref={box}
      className="relative aspect-[16/10] w-full select-none overflow-hidden bg-ink-3"
      onPointerDown={(e) => { drag.current = true; (e.target as Element).setPointerCapture?.(e.pointerId); set(e.clientX) }}
      onPointerMove={(e) => drag.current && set(e.clientX)}
      onPointerUp={() => { drag.current = false }}
    >
      {/* After (full) */}
      <div className="absolute inset-0">
        <img src={after} alt={labelAfter} className="h-full w-full object-cover" style={{ filter: afterFilter }} draggable={false} />
        {overlay}
      </div>
      {/* Before (clipped) */}
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <img src={before} alt={labelBefore} className="h-full w-full object-cover" draggable={false} />
      </div>
      <span className="absolute left-2 top-2 bg-ink/80 px-2 py-0.5 text-[11.5px] font-semibold">{labelBefore}</span>
      <span className="absolute right-2 top-2 bg-ink/80 px-2 py-0.5 text-[11.5px] font-semibold">{labelAfter}</span>
      <div className="absolute inset-y-0 w-0.5 bg-accent" style={{ left: `${pos}%` }}>
        <button
          type="button"
          role="slider"
          aria-label="Compare before and after"
          aria-valuenow={Math.round(pos)}
          aria-valuemin={0}
          aria-valuemax={100}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') setPos((p) => Math.max(0, p - 5))
            if (e.key === 'ArrowRight') setPos((p) => Math.min(100, p + 5))
          }}
          className="absolute top-1/2 left-1/2 grid size-9 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize place-items-center rounded-full bg-accent text-accent-ink shadow-lg"
        >
          <MoveHorizontal className="size-4" />
        </button>
      </div>
    </div>
  )
}

/** Simulated new damage drawn onto the "after" photo so the comparison reads clearly. */
export function DamageMarks({ marks, onToggle, accepted }: { marks: { x: number; y: number; label: string; severity: string; confidence?: number }[]; onToggle?: (i: number) => void; accepted?: boolean[] }) {
  return (
    <>
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 62.5" preserveAspectRatio="none" aria-hidden>
        {marks.map((m, i) => (
          <g key={i} stroke="rgba(255,255,255,.85)" strokeWidth=".25" fill="none">
            <path d={`M${m.x * 100 - 4} ${m.y * 62.5 - 0.6} l2 .8 l1.6 -.5 l2.2 .9 l1.8 -.4`} />
            <path d={`M${m.x * 100 - 3} ${m.y * 62.5 + 0.4} l2.5 .5 l2 -.3`} />
          </g>
        ))}
      </svg>
      {marks.map((m, i) => (
        <button
          key={i}
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggle?.(i) }}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%` }}
          aria-label={`${m.label}, ${m.severity}${accepted?.[i] === false ? ', dismissed' : ''}`}
        >
          <span className={`grid size-8 place-items-center rounded-full border-2 ${accepted?.[i] === false ? 'border-mute bg-ink/40' : 'border-bad bg-bad/25 animate-[pulseDot_1.6s_ease-in-out_infinite]'}`}>
            <span className={`size-2 rounded-full ${accepted?.[i] === false ? 'bg-mute' : 'bg-bad'}`} />
          </span>
          <span className="absolute left-9 top-0 whitespace-nowrap bg-ink/90 px-1.5 py-0.5 text-[11px] font-semibold">
            {m.label}{m.confidence ? ` · ${Math.round(m.confidence * 100)}%` : ''}
          </span>
        </button>
      ))}
    </>
  )
}
