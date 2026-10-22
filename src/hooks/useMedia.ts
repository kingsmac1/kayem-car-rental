import { useSyncExternalStore } from 'react'

export function useMedia(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query)
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

export const useReducedMotion = () => useMedia('(prefers-reduced-motion: reduce)')
export const useIsTouch = () => useMedia('(hover: none), (pointer: coarse)')
export const useIsMobile = () => useMedia('(max-width: 767px)')
