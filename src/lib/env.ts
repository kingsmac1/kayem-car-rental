/** Device/motion capability checks used to choose lighter effects. */
export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const isTouch = () =>
  typeof window !== 'undefined' && window.matchMedia('(hover: none), (pointer: coarse)').matches

export const isSmallScreen = () => typeof window !== 'undefined' && window.innerWidth < 768

/** Rough low-power heuristic: few cores, low memory or data saver on. */
export function isLowPower() {
  if (typeof navigator === 'undefined') return false
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } }
  return (
    (nav.hardwareConcurrency ?? 8) <= 4 ||
    (nav.deviceMemory ?? 8) <= 4 ||
    nav.connection?.saveData === true
  )
}
