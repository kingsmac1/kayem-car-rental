import Lenis from 'lenis'
import { gsap, ScrollTrigger } from './gsap'
import { prefersReducedMotion, isTouch } from './env'

/** One Lenis instance for the public site, driven by GSAP's ticker so ScrollTrigger stays in sync. */
let lenis: Lenis | null = null
let tick: ((t: number) => void) | null = null

export function startSmoothScroll() {
  if (lenis || prefersReducedMotion() || isTouch()) return null
  lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.85, smoothWheel: true })
  lenis.on('scroll', ScrollTrigger.update)
  tick = (t: number) => lenis?.raf(t * 1000)
  gsap.ticker.add(tick)
  gsap.ticker.lagSmoothing(0)
  return lenis
}

export function stopSmoothScroll() {
  if (tick) gsap.ticker.remove(tick)
  lenis?.destroy()
  lenis = null
  tick = null
}

export const getLenis = () => lenis

export function scrollToTop(immediate = true) {
  if (lenis) lenis.scrollTo(0, { immediate })
  else window.scrollTo({ top: 0, behavior: immediate ? 'instant' : 'smooth' })
}

export function scrollToEl(el: Element | string, offset = 0) {
  const target = typeof el === 'string' ? document.querySelector(el) : el
  if (!target) return
  if (lenis) lenis.scrollTo(target as HTMLElement, { offset, duration: 1.4 })
  else (target as HTMLElement).scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
}

/** Freeze page scroll (menu, modals). */
export function lockScroll(locked: boolean) {
  if (lenis) {
    if (locked) lenis.stop()
    else lenis.start()
  }
  document.documentElement.style.overflow = locked ? 'hidden' : ''
}
