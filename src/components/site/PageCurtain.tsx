import { useRouterState } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { brand } from '@/config/brand'
import { useReducedMotion } from '@/hooks/useMedia'

/** Racing-style wipe between routes: a yellow panel with a chequered edge sweeps up and off. */
export function PageCurtain() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const first = useRef(true)
  const [key, setKey] = useState<string | null>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (reduced) return
    setKey(pathname + Date.now())
    const t = setTimeout(() => setKey(null), 900)
    return () => clearTimeout(t)
  }, [pathname, reduced])

  return (
    <AnimatePresence>
      {key && (
        <motion.div
          key={key}
          className="pointer-events-none fixed inset-0 z-[90] flex flex-col"
          initial={{ y: '0%' }}
          animate={{ y: '-100%' }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.75, ease: [0.76, 0, 0.24, 1], delay: 0.08 }}
          aria-hidden
        >
          <div className="flex flex-1 items-center justify-center bg-accent">
            <span className="display text-[clamp(28px,6vw,64px)] font-extrabold text-accent-ink">{brand.monogram}</span>
          </div>
          <div className="chequer h-7 bg-ink [background-size:14px_14px]" />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
