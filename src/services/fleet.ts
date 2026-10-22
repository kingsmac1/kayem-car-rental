/**
 * Fleet service — cars, availability and status.
 * TODO: connect real provider — replace reads/writes on `db` with Supabase queries
 * on the `cars`, `car_documents` and `bookings` tables (see supabase/schema.sql).
 */
import { db } from '@/lib/db'
import { latency } from '@/lib/utils'
import type { Booking, Car, CarStatus, DemoState } from '@/mocks/types'

export type Bookability = { ok: boolean; reasons: string[] }

/** Cars with expired documents or overdue servicing are blocked from booking automatically. */
export function bookability(car: Car, now = new Date()): Bookability {
  const reasons: string[] = []
  for (const d of car.documents) if (new Date(d.expires) < now) reasons.push(`${d.type} expired`)
  if (car.mileage - car.lastServiceKm > car.serviceEveryKm) reasons.push(`Service overdue by ${(car.mileage - car.lastServiceKm - car.serviceEveryKm).toLocaleString()} km`)
  if (car.status === 'maintenance') reasons.push('In maintenance')
  if (car.status === 'blocked') reasons.push(car.blockedReason ?? 'Blocked by staff')
  return { ok: reasons.length === 0, reasons }
}

/** Display status: blocked overrides others when rules fail. */
export function effectiveStatus(car: Car): CarStatus {
  if (car.status === 'maintenance' || car.status === 'rented') return car.status
  return bookability(car).ok ? car.status : 'blocked'
}

const BLOCKING: Booking['status'][] = ['pending', 'confirmed', 'active']

export function overlaps(s: DemoState, carId: string, start: Date, end: Date, ignoreId?: string) {
  return s.bookings.filter(
    (b) => b.carId === carId && b.id !== ignoreId && BLOCKING.includes(b.status) && new Date(b.start) < end && new Date(b.end) > start,
  )
}

export function isAvailable(s: DemoState, car: Car, start?: Date, end?: Date) {
  if (!bookability(car).ok) return false
  if (!start || !end) return car.status === 'available'
  return overlaps(s, car.id, start, end).length === 0
}

export function docState(expires: string): 'ok' | 'soon' | 'expired' {
  const days = (new Date(expires).getTime() - Date.now()) / 86_400_000
  return days < 0 ? 'expired' : days < 30 ? 'soon' : 'ok'
}

export const fleetService = {
  async listCars() {
    await latency(150, 400)
    return db.get().cars
  },
  async getCar(id: string) {
    await latency(100, 300)
    return db.get().cars.find((c) => c.id === id) ?? null
  },
  async availability(carId: string, start: Date, end: Date) {
    await latency(200, 500)
    const s = db.get()
    const car = s.cars.find((c) => c.id === carId)
    if (!car) return { available: false, reason: 'Car not found' }
    const b = bookability(car)
    if (!b.ok) return { available: false, reason: b.reasons.join(', ') }
    const clash = overlaps(s, carId, start, end)
    return clash.length ? { available: false, reason: 'Already booked for part of these dates' } : { available: true as const }
  },
  async setStatus(carId: string, status: CarStatus, reason?: string) {
    await latency()
    db.set((d) => {
      const c = d.cars.find((x) => x.id === carId)
      if (c) {
        c.status = status
        c.blockedReason = status === 'blocked' ? reason : undefined
      }
    })
  },
  async saveCar(car: Car) {
    await latency()
    db.set((d) => {
      const i = d.cars.findIndex((c) => c.id === car.id)
      if (i >= 0) d.cars[i] = car
      else d.cars.unshift(car)
    })
    return car
  },
}
