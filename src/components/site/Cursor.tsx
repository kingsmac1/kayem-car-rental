import { useEffect, useRef, useState } from 'react'
import { gsap } from '@/lib/gsap'
import { useIsTouch, useReducedMotion } from '@/hooks/useMedia'
import { cn } from '@/lib/utils'

type Mode = 'default' | 'link' | 'view' | 'drag' | 'book'
const LABEL: Record<Mode, string> = { default: '', link: '', view: 'View', drag: 'Drag', book: 'Book' }

/** Custom cursor whose label changes with context: drag on sliders, view on cars, book on booking buttons. */
export function Cursor() {
  const touch = useIsTouch()
  const reduced = useReducedMotion()
  const dot = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<Mode>('default')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (touch || !dot.current) return
    const el = dot.current
    const xTo = gsap.quickTo(el, 'x', { duration: reduced ? 0 : 0.35, ease: 'power3' })
    const yTo = gsap.quickTo(el, 'y', { duration: reduced ? 0 : 0.35, ease: 'power3' })
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      setVisible(true)
      xTo(e.clientX)
      yTo(e.clientY)
      const t = (e.target as Element | null)?.closest?.('[data-cursor], a, button, [role="button"], input, select, textarea, label')
      const c = t?.getAttribute('data-cursor') as Mode | null
      setMode(c ?? (t ? 'link' : 'default'))
    }
    const leave = () => setVisible(false)
    window.addEventListener('pointermove', move, { passive: true })
    document.documentElement.addEventListener('pointerleave', leave)
    return () => {
      window.removeEventListener('pointermove', move)
      document.documentElement.removeEventListener('pointerleave', leave)
    }
  }, [touch, reduced])

  if (touch) return null
  const big = mode === 'view' || mode === 'drag' || mode === 'book'
  return (
    <div ref={dot} className="pointer-events-none fixed left-0 top-0 z-[95] hidden md:block" aria-hidden>
      <div
        className={cn(
          'grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-accent text-accent-ink transition-[width,height,opacity,background-color] duration-300 [transition-timing-function:var(--ease-out-expo)]',
          big ? 'size-[78px]' : mode === 'link' ? 'size-3.5 bg-paper' : 'size-2',
          visible ? 'opacity-100' : 'opacity-0',
        )}
      >
        <span className={cn('label !text-[9px] transition-opacity duration-200', big ? 'opacity-100' : 'opacity-0')}>{LABEL[mode]}</span>
      </div>
    </div>
  )
}
