import { useRef, useSyncExternalStore } from 'react'
import { DEMO_VERSION, generateDemoState } from '@/mocks/generate'
import type { DemoState } from '@/mocks/types'
import { DAY, startOfDay } from './utils'

/**
 * In-browser demo database.
 * - Starts from seeded mock data (src/mocks), with dates relative to today.
 * - Every change is saved to localStorage so it survives a refresh.
 * - If you open the demo on a later day, all saved dates move forward by the
 *   same number of days, so the dashboard always looks live.
 * - resetDemo() throws away changes and regenerates the seed data.
 *
 * TODO: connect real provider — when Supabase is connected, services stop
 * calling this module and query tables instead (see supabase/schema.sql).
 */

const KEY = 'rentalos:demo'
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/

function shiftDates<T>(value: T, ms: number): T {
  if (typeof value === 'string') return (ISO_RE.test(value) ? new Date(new Date(value).getTime() + ms).toISOString() : value) as T
  if (Array.isArray(value)) return value.map((v) => shiftDates(v, ms)) as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[k] = shiftDates(v, ms)
    return out as T
  }
  return value
}

function load(): DemoState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const saved = JSON.parse(raw) as DemoState
      if (saved.version === DEMO_VERSION) {
        const diff = startOfDay().getTime() - startOfDay(new Date(saved.savedOn)).getTime()
        if (Math.abs(diff) >= DAY) {
          const shifted = shiftDates(saved, diff)
          shifted.savedOn = startOfDay().toISOString()
          return shifted
        }
        return saved
      }
    }
  } catch {
    /* corrupted or unavailable storage — fall back to fresh seed */
  }
  return generateDemoState()
}

let state: DemoState = load()
const listeners = new Set<() => void>()

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* storage full or blocked — demo still works in memory */
  }
}

export const db = {
  get: () => state,
  set(updater: (draft: DemoState) => DemoState | void) {
    const draft = structuredClone(state)
    const result = updater(draft)
    state = result ?? draft
    persist()
    listeners.forEach((l) => l())
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}

export function resetDemo() {
  try {
    localStorage.removeItem(KEY)
    localStorage.removeItem('rentalos:session')
    localStorage.removeItem('rentalos:verified')
  } catch {
    /* ignore */
  }
  state = generateDemoState()
  persist()
  listeners.forEach((l) => l())
  session = {}
  sessionListeners.forEach((l) => l())
}

function shallowEqual(a: unknown, b: unknown) {
  if (Object.is(a, b)) return true
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v, i) => Object.is(v, b[i]))
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a as object)
    const kb = Object.keys(b as object)
    return ka.length === kb.length && ka.every((k) => Object.is((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
  }
  return false
}

/**
 * Subscribe a component to a slice of the demo database.
 * Results are cached per state version and shallow-compared, so selectors may
 * safely return new arrays/objects (e.g. `s.cars.filter(...)`).
 */
export function useDb<T>(selector: (s: DemoState) => T): T {
  const cache = useRef<{ s?: DemoState; sel?: (s: DemoState) => T; v?: T }>({})
  const get = () => {
    const c = cache.current
    if (c.s === state && c.sel === selector) return c.v as T
    const next = selector(state)
    const v = c.s !== undefined && shallowEqual(next, c.v) ? (c.v as T) : next
    cache.current = { s: state, sel: selector, v }
    return v
  }
  return useSyncExternalStore(db.subscribe, get, get)
}

/** Log a staff action to the audit trail. */
export function audit(action: string, actor = currentStaff().name, role = currentStaff().role) {
  db.set((d) => {
    d.audit.unshift({ id: `a-${Date.now()}`, at: new Date().toISOString(), actor, role, action })
    d.audit = d.audit.slice(0, 200)
  })
}

// ---- lightweight session (mock logins) -------------------------------------
import type { StaffRole } from '@/mocks/types'

export interface Session {
  staff?: { name: string; role: StaffRole }
  customerId?: string
  corporateId?: string
  partnerId?: string
  chauffeurId?: string
}
const SKEY = 'rentalos:session'
let session: Session = (() => {
  try {
    return JSON.parse(localStorage.getItem(SKEY) ?? '{}') as Session
  } catch {
    return {}
  }
})()
const sessionListeners = new Set<() => void>()

export function setSession(patch: Partial<Session>) {
  session = { ...session, ...patch }
  try {
    localStorage.setItem(SKEY, JSON.stringify(session))
  } catch {
    /* ignore */
  }
  sessionListeners.forEach((l) => l())
}
export function clearSession(key: keyof Session) {
  const next = { ...session }
  delete next[key]
  session = next
  try {
    localStorage.setItem(SKEY, JSON.stringify(session))
  } catch {
    /* ignore */
  }
  sessionListeners.forEach((l) => l())
}
export const getSession = () => session
export function useSession() {
  return useSyncExternalStore(
    (l) => {
      sessionListeners.add(l)
      return () => sessionListeners.delete(l)
    },
    () => session,
    () => session,
  )
}
export const currentStaff = () => session.staff ?? { name: 'Emeka Okafor', role: 'Owner' as StaffRole }
