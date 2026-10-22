/**
 * Bookings service — create, list, update, cancel and extend.
 * TODO: connect real provider — swap `db` for Supabase (`bookings` table) and run
 * the overlap check as a Postgres exclusion constraint / RPC (see supabase/schema.sql).
 */
import { audit, db } from '@/lib/db'
import { addDays, latency } from '@/lib/utils'
import type { Booking, BookingStatus } from '@/mocks/types'
import { overlaps } from './fleet'

export class BookingConflictError extends Error {
  clashes: Booking[]
  constructor(clashes: Booking[]) {
    super(`This car is already booked for part of those dates (${clashes.map((c) => c.ref).join(', ')}).`)
    this.clashes = clashes
  }
}

export const STATUS_FLOW: BookingStatus[] = ['pending', 'confirmed', 'active', 'returned', 'closed']

function nextRef() {
  const nums = db.get().bookings.map((b) => Number(b.ref.split('-')[1]) || 0)
  return `EMK-${Math.max(4100, ...nums) + 1}`
}

export type NewBooking = Omit<Booking, 'id' | 'ref' | 'createdAt' | 'deductions' | 'depositStatus'> & { depositStatus?: Booking['depositStatus'] }

export const bookingService = {
  async list() {
    await latency(150, 400)
    return db.get().bookings
  },

  async create(input: NewBooking, actor?: string) {
    await latency(400, 900)
    const s = db.get()
    const clashes = overlaps(s, input.carId, new Date(input.start), new Date(input.end))
    if (clashes.length) throw new BookingConflictError(clashes)
    const booking: Booking = {
      ...input,
      id: `b-${Date.now()}`,
      ref: nextRef(),
      createdAt: new Date().toISOString(),
      deductions: [],
      depositStatus: input.depositStatus ?? (input.paid > 0 ? 'held' : 'pending'),
    }
    db.set((d) => {
      d.bookings.push(booking)
    })
    if (actor) audit(`Created booking ${booking.ref}`)
    return booking
  },

  async update(id: string, patch: Partial<Booking>) {
    await latency()
    const s = db.get()
    const current = s.bookings.find((b) => b.id === id)
    if (!current) throw new Error('Booking not found')
    const next = { ...current, ...patch }
    if (patch.start || patch.end || patch.carId) {
      const clashes = overlaps(s, next.carId, new Date(next.start), new Date(next.end), id)
      if (clashes.length) throw new BookingConflictError(clashes)
    }
    db.set((d) => {
      const i = d.bookings.findIndex((b) => b.id === id)
      d.bookings[i] = next
      // Keep the car's status in sync with the rental lifecycle.
      const car = d.cars.find((c) => c.id === next.carId)
      if (car && patch.status === 'active') car.status = 'rented'
      if (car && (patch.status === 'returned' || patch.status === 'closed') && car.status === 'rented') car.status = 'available'
    })
    if (patch.status) audit(`Moved ${current.ref} to ${patch.status}`)
    return next
  },

  async advance(id: string) {
    const b = db.get().bookings.find((x) => x.id === id)
    if (!b) throw new Error('Booking not found')
    const i = STATUS_FLOW.indexOf(b.status)
    if (i < 0 || i >= STATUS_FLOW.length - 1) return b
    return this.update(id, { status: STATUS_FLOW[i + 1] })
  },

  async cancel(id: string, reason = 'Cancelled by staff') {
    await latency()
    const b = db.get().bookings.find((x) => x.id === id)
    if (!b) throw new Error('Booking not found')
    db.set((d) => {
      const x = d.bookings.find((y) => y.id === id)!
      x.status = 'cancelled'
      x.depositStatus = x.depositStatus === 'held' ? 'refunded' : x.depositStatus
    })
    audit(`Cancelled ${b.ref} — ${reason}`)
  },

  /** Extend by N days. Throws BookingConflictError if the car is booked right after. */
  async extend(id: string, days: number, pricePerDay: number) {
    await latency(400, 800)
    const s = db.get()
    const b = s.bookings.find((x) => x.id === id)
    if (!b) throw new Error('Booking not found')
    const newEnd = addDays(b.end, days)
    const clashes = overlaps(s, b.carId, new Date(b.end), newEnd, id)
    if (clashes.length) throw new BookingConflictError(clashes)
    const extra = pricePerDay * days
    db.set((d) => {
      const x = d.bookings.find((y) => y.id === id)!
      x.end = newEnd.toISOString()
      x.total += extra
      x.paid += extra
      x.extendedDays = (x.extendedDays ?? 0) + days
    })
    audit(`Extended ${b.ref} by ${days} day${days > 1 ? 's' : ''}`)
    return { newEnd, extra }
  },
}
