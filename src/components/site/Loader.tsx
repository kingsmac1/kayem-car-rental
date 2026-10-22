import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { brand } from '@/config/brand'
import { prefersReducedMotion } from '@/lib/env'

const KEY = 'rentalos:loaded'

function shouldShow() {
  try {
    return !sessionStorage.getItem(KEY) && !prefersReducedMotion()
  } catch {
    return false
  }
}

/** Seconds the hero intro should wait: longer only when the start-lights loader is showing. */
export const introDelay = shouldShow() ? 1.5 : 0.15

/** Five start lights come on one by one, then "lights out" and the curtain lifts. First visit per session, < 2s. */
export function Loader({ onDone }: { onDone?: () => void }) {
  const [show, setShow] = useState(shouldShow)
  const [lit, setLit] = useState(0)

  useEffect(() => {
    if (!show) {
      onDone?.()
      return
    }
    try {
      sessionStorage.setItem(KEY, '1')
    } catch {
      /* ignore */
    }
    const timers = [1, 2, 3, 4, 5].map((n) => setTimeout(() => setLit(n), 140 + n * 170))
    timers.push(setTimeout(() => setLit(0), 1250))
    timers.push(setTimeout(() => setShow(false), 1450))
    return () => timers.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <AnimatePresence onExitComplete={onDone}>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-ink"
          exit={{ clipPath: 'inset(0 0 100% 0)' }}
          initial={{ clipPath: 'inset(0 0 0% 0)' }}
          transition={{ duration: 0.55, ease: [0.76, 0, 0.24, 1] }}
          role="status"
          aria-label={`Loading ${brand.name}`}
        >
          <p className="display text-[clamp(40px,9vw,96px)] font-extrabold tracking-[-0.04em] text-paper">{brand.logoText}</p>
          <div className="mt-8 flex gap-3" aria-hidden>
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} className="size-3.5 transition-colors duration-150" style={{ background: lit >= n ? brand.colors.accent : 'color-mix(in oklab, var(--brand-paper) 14%, transparent)' }} />
            ))}
          </div>
          <p className="label mt-6 text-mute">{lit === 0 && show ? 'Lights out' : brand.tagline}</p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
