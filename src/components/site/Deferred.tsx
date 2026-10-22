import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ScrollTrigger } from '@/lib/gsap'

let refreshTimer: ReturnType<typeof setTimeout> | undefined
const refreshSoon = () => {
  clearTimeout(refreshTimer)
  refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 150)
}

/**
 * Mounts a below-the-fold section only when it nears the viewport, so the first
 * paint doesn't pay for every section's scroll triggers and text splits.
 */
export function Deferred({ children, minHeight = 600, id }: { children: ReactNode; minHeight?: number; id?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [show, setShow] = useState(false)
  const [armed, setArmed] = useState(() => typeof window !== 'undefined' && window.scrollY > 0)
  // Wait for the first scroll/touch (or a few idle seconds) before watching, so first paint stays light.
  useEffect(() => {
    if (armed) return
    const arm = () => setArmed(true)
    const t = setTimeout(arm, 4000)
    window.addEventListener('scroll', arm, { once: true, passive: true })
    window.addEventListener('wheel', arm, { once: true, passive: true })
    window.addEventListener('touchstart', arm, { once: true, passive: true })
    window.addEventListener('keydown', arm, { once: true })
    return () => {
      clearTimeout(t)
      window.removeEventListener('scroll', arm)
      window.removeEventListener('wheel', arm)
      window.removeEventListener('touchstart', arm)
      window.removeEventListener('keydown', arm)
    }
  }, [armed])
  useEffect(() => {
    const el = ref.current
    if (!el || show || !armed) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setShow(true), { rootMargin: '600px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [show, armed])
  useEffect(() => {
    if (show) refreshSoon()
  }, [show])
  if (show) return <>{children}</>
  return <div ref={ref} id={id} style={{ minHeight }} aria-hidden />
}
