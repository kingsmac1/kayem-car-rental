/**
 * GPS tracking — live positions, trips, alerts and the remote immobiliser.
 * TODO: connect real provider — read positions from a Traccar server
 * (GET /api/positions, WebSocket /api/socket), trips from /api/reports/trips,
 * geofences from /api/geofences, and send the immobiliser as a Traccar command
 * (engineStop) only after the same two-step + speed < 5 km/h checks used here.
 *
 * Demo: each car follows a hand-drawn polyline along a real road, ping-ponging
 * with stops, so positions are a pure function of time (no server needed).
 */
import type { City } from '@/config/brand'
import { cityCentre, locationById } from '@/mocks/locations'
import type { Car, DemoState } from '@/mocks/types'
import { sleep } from '@/lib/utils'

type LL = [number, number]

const ROUTES: Record<City, { name: string; pts: LL[] }[]> = {
  Lagos: [
    { name: 'Lekki-Epe Expressway', pts: [[6.4474, 3.4722], [6.4433, 3.49], [6.44, 3.51], [6.448, 3.535], [6.46, 3.555], [6.4683, 3.5684]] },
    { name: 'Third Mainland Bridge', pts: [[6.455, 3.405], [6.48, 3.395], [6.51, 3.39], [6.53, 3.385], [6.55, 3.37], [6.5631, 3.3366]] },
    { name: 'Ozumba Mbadiwe Avenue', pts: [[6.4253, 3.4307], [6.432, 3.42], [6.439, 3.412], [6.444, 3.424], [6.4487, 3.4342]] },
    { name: 'Ikorodu Road', pts: [[6.5774, 3.3212], [6.563, 3.34], [6.547, 3.358], [6.525, 3.372], [6.5, 3.38]] },
    { name: 'Lagos–Ibadan Expressway', pts: [[6.5774, 3.3212], [6.62, 3.34], [6.68, 3.37], [6.75, 3.4], [6.82, 3.42]] },
  ],
  Abuja: [
    { name: 'Airport Road', pts: [[9.0068, 7.2632], [9.015, 7.32], [9.03, 7.38], [9.045, 7.43], [9.0579, 7.47]] },
    { name: 'Kubwa Expressway', pts: [[9.0817, 7.4702], [9.1, 7.43], [9.125, 7.39], [9.15, 7.35]] },
    { name: 'Maitama–Asokoro', pts: [[9.0882, 7.4934], [9.07, 7.5], [9.055, 7.515], [9.0444, 7.5266]] },
  ],
  'Port Harcourt': [
    { name: 'Airport Road (Omagwa)', pts: [[5.0155, 6.9496], [4.96, 6.96], [4.9, 6.99], [4.85, 7.005], [4.8156, 7.0049]] },
    { name: 'Aba Road', pts: [[4.8241, 7.0144], [4.83, 7.03], [4.845, 7.05], [4.86, 7.07]] },
    { name: 'Trans-Amadi Road', pts: [[4.8156, 7.0049], [4.8133, 7.02], [4.8133, 7.0385]] },
  ],
}

export interface Geofence {
  id: string
  city: City
  name: string
  center: LL
  radiusKm: number
}

export const defaultGeofences: Geofence[] = [
  { id: 'gf-lagos', city: 'Lagos', name: 'Lagos metro (approved)', center: cityCentre.Lagos, radiusKm: 24 },
  { id: 'gf-abuja', city: 'Abuja', name: 'FCT core (approved)', center: cityCentre.Abuja, radiusKm: 30 },
  { id: 'gf-phc', city: 'Port Harcourt', name: 'Port Harcourt (approved)', center: cityCentre['Port Harcourt'], radiusKm: 28 },
]

export interface Position {
  carId: string
  lat: number
  lng: number
  speed: number
  heading: number
  moving: boolean
  fuel: number
  road: string
  ignition: boolean
  immobilised: boolean
  insideGeofence: boolean
}

export function haversineKm(a: LL, b: LL) {
  const R = 6371
  const dLat = ((b[0] - a[0]) * Math.PI) / 180
  const dLng = ((b[1] - a[1]) * Math.PI) / 180
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return (h >>> 0) / 4294967296
}

const immobilised = new Set<string>()

function routeFor(car: Car) {
  const routes = ROUTES[car.city]
  // The Prado always takes the Lagos–Ibadan expressway in the demo so it leaves its geofence.
  if (car.id === 'prado-lag') return routes[4]
  return routes[Math.floor(hash(car.id) * (routes.length - (car.city === 'Lagos' ? 1 : 0)))]
}

function pointAt(pts: LL[], t: number): { p: LL; heading: number } {
  const lens: number[] = []
  let total = 0
  for (let i = 1; i < pts.length; i++) {
    const l = haversineKm(pts[i - 1], pts[i])
    lens.push(l)
    total += l
  }
  let d = t * total
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) {
      const f = lens[i] ? Math.min(1, d / lens[i]) : 0
      const a = pts[i]
      const b = pts[i + 1]
      const heading = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI
      return { p: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], heading }
    }
    d -= lens[i]
  }
  return { p: pts[0], heading: 0 }
}

/** Position of one car at time `now` (pure function of time + car id). */
export function positionOf(car: Car, onTrip: boolean, now = Date.now(), fences = defaultGeofences): Position {
  const fence = fences.find((f) => f.city === car.city)
  if (!onTrip || immobilised.has(car.id)) {
    const home = locationById(car.city === 'Lagos' ? 'lag-lekki' : car.city === 'Abuja' ? 'abj-wuse' : 'phc-gra')!
    const jitter = (hash(car.id) - 0.5) * 0.004
    const pos = immobilised.has(car.id) && onTrip ? lastMoving.get(car.id) ?? [home.lat, home.lng] : ([home.lat + jitter, home.lng + jitter] as LL)
    return {
      carId: car.id, lat: pos[0], lng: pos[1], speed: 0, heading: 0, moving: false, fuel: car.fuelLevel, road: onTrip ? 'Stopped (immobilised)' : 'Parked at base',
      ignition: false, immobilised: immobilised.has(car.id), insideGeofence: fence ? haversineKm(pos, fence.center) <= fence.radiusKm : true,
    }
  }
  const route = routeFor(car)
  const period = 240 + hash(car.id + 'p') * 180 // seconds for one leg
  const phase = ((now / 1000 + hash(car.id + 'o') * 1000) % (period * 2)) / period // 0..2
  // Stop for the first 12% of each leg (traffic light / pickup), then move.
  const leg = phase < 1 ? phase : phase - 1
  const stopped = leg < 0.12
  const progressLeg = stopped ? 0 : (leg - 0.12) / 0.88
  const eased = progressLeg < 0.5 ? 2 * progressLeg * progressLeg : 1 - (-2 * progressLeg + 2) ** 2 / 2
  const t = phase < 1 ? eased : 1 - eased
  const { p, heading } = pointAt(route.pts, t)
  // Speed follows the ease curve: slow off the line, fastest mid-route.
  const velocityFactor = progressLeg < 0.5 ? 4 * progressLeg : 4 * (1 - progressLeg)
  let speed = stopped ? 0 : 12 + 44 * velocityFactor + hash(car.id + 's') * 12
  if (car.id === 'prado-lag' && !stopped && progressLeg > 0.4 && progressLeg < 0.6) speed = Math.max(speed, 138)
  speed = Math.round(speed)
  lastMoving.set(car.id, p)
  return {
    carId: car.id, lat: p[0], lng: p[1], speed, heading: phase < 1 ? heading : heading + 180, moving: speed > 0,
    fuel: Math.max(8, Math.round(car.fuelLevel - t * 12)), road: route.name, ignition: true, immobilised: false,
    insideGeofence: fence ? haversineKm(p, fence.center) <= fence.radiusKm : true,
  }
}
const lastMoving = new Map<string, LL>()

export function onTripCarIds(s: DemoState) {
  return new Set(s.bookings.filter((b) => b.status === 'active').map((b) => b.carId))
}

export const trackingService = {
  livePositions(s: DemoState, now = Date.now(), fences = defaultGeofences): Position[] {
    const onTrip = onTripCarIds(s)
    return s.cars.map((c) => positionOf(c, onTrip.has(c.id), now, fences))
  },

  /** Recent trip polyline (for history replay): samples the last N minutes. */
  tripHistory(car: Car, minutes = 20, now = Date.now()): { lat: number; lng: number; speed: number; at: number }[] {
    const out = []
    for (let m = minutes * 60; m >= 0; m -= 15) {
      const at = now - m * 1000
      const p = positionOf(car, true, at)
      out.push({ lat: p.lat, lng: p.lng, speed: p.speed, at })
    }
    return out
  },

  /** Two-step immobiliser. Refuses while the car is moving faster than 5 km/h. */
  async immobilise(car: Car, onTrip: boolean): Promise<{ ok: boolean; message: string }> {
    await sleep(1200)
    const p = positionOf(car, onTrip)
    if (p.speed >= 5) return { ok: false, message: `Not sent: ${car.model} is moving at ${p.speed} km/h. For safety the engine can only be cut below 5 km/h. We’ll keep watching and alert you when it stops.` }
    immobilised.add(car.id)
    return { ok: true, message: `Immobiliser command delivered. ${car.model} will not restart until released.` }
  },
  async release(carId: string) {
    await sleep(800)
    immobilised.delete(carId)
  },
  isImmobilised: (carId: string) => immobilised.has(carId),

  shareLink(carId: string) {
    return `https://track.emkay.demo/share/${carId}-${Math.random().toString(36).slice(2, 8)}`
  },
}
