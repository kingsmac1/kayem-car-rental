/** Deterministic PRNG so mock data is identical on every load. */
export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function createRng(seed: number) {
  const r = mulberry32(seed)
  return {
    next: r,
    int: (min: number, max: number) => Math.floor(r() * (max - min + 1)) + min,
    pick: <T,>(arr: readonly T[]) => arr[Math.floor(r() * arr.length)],
    chance: (p: number) => r() < p,
    shuffle: <T,>(arr: T[]) => {
      const a = [...arr]
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
      }
      return a
    },
  }
}
export type Rng = ReturnType<typeof createRng>
