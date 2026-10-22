import type { Booking, Car, DemoState } from '@/mocks/types'
import { addDays, DAY, isoDate, startOfDay } from './utils'

/** Revenue-bearing bookings (not cancelled). */
export const billable = (s: DemoState) => s.bookings.filter((b) => b.status !== 'cancelled')

/** Revenue is recognised per rental day across the booking period. */
export function revenueByDay(s: DemoState, from: Date, to: Date) {
  const days: { date: string; revenue: number; bookings: number }[] = []
  for (let d = startOfDay(from); d <= to; d = addDays(d, 1)) days.push({ date: isoDate(d), revenue: 0, bookings: 0 })
  const idx = new Map(days.map((d, i) => [d.date, i]))
  for (const b of billable(s)) {
    const start = startOfDay(new Date(b.start))
    const end = startOfDay(new Date(b.end))
    const n = Math.max(1, Math.round((+end - +start) / DAY))
    const perDay = b.total / n
    for (let k = 0; k < n; k++) {
      const i = idx.get(isoDate(addDays(start, k)))
      if (i !== undefined) days[i].revenue += perDay
    }
    const ci = idx.get(isoDate(b.createdAt))
    if (ci !== undefined) days[ci].bookings++
  }
  return days.map((d) => ({ ...d, revenue: Math.round(d.revenue) }))
}

export function revenueBetween(s: DemoState, from: Date, to: Date) {
  return revenueByDay(s, from, to).reduce((a, d) => a + d.revenue, 0)
}

/** Share of days each car was on rent in the window. */
export function utilisation(s: DemoState, from: Date, to: Date, carId?: string) {
  const cars = carId ? s.cars.filter((c) => c.id === carId) : s.cars
  const windowDays = Math.max(1, Math.round((+to - +from) / DAY))
  let busy = 0
  for (const c of cars) {
    for (const b of billable(s).filter((x) => x.carId === c.id)) {
      const a = Math.max(+from, +new Date(b.start))
      const z = Math.min(+to, +new Date(b.end))
      if (z > a) busy += (z - a) / DAY
    }
  }
  return Math.min(1, busy / (windowDays * cars.length))
}

export function carRevenue(s: DemoState, carId: string, from?: Date, to?: Date) {
  return billable(s)
    .filter((b) => b.carId === carId && (!from || new Date(b.end) >= from) && (!to || new Date(b.start) <= to))
    .reduce((a, b) => a + b.total, 0)
}
export function carMaintenanceCost(s: DemoState, carId: string, from?: Date) {
  return s.maintenance.filter((m) => m.carId === carId && (!from || new Date(m.date) >= from)).reduce((a, m) => a + m.cost, 0)
}

export function profitPerCar(s: DemoState, from?: Date, to?: Date) {
  return s.cars
    .map((c) => {
      const revenue = carRevenue(s, c.id, from, to)
      const maintenance = carMaintenanceCost(s, c.id, from)
      const partnerShare = c.owner !== 'company' ? Math.round(revenue * (1 - (s.partners.find((p) => p.id === c.owner)?.commission ?? 0.25))) : 0
      return { car: c, revenue, maintenance, partnerShare, profit: revenue - maintenance - partnerShare, utilisation: from && to ? utilisation(s, from, to, c.id) : 0 }
    })
    .sort((a, b) => b.profit - a.profit)
}

export function customerLtv(s: DemoState, customerId: string) {
  return billable(s).filter((b) => b.customerId === customerId).reduce((a, b) => a + b.total, 0)
}

export function topCustomers(s: DemoState, n = 10) {
  return s.customers
    .map((c) => ({ customer: c, ltv: customerLtv(s, c.id), trips: billable(s).filter((b) => b.customerId === c.id).length }))
    .filter((x) => x.trips > 0)
    .sort((a, b) => b.ltv - a.ltv)
    .slice(0, n)
}

export const outstanding = (s: DemoState) => billable(s).filter((b) => b.paid < b.total).map((b) => ({ booking: b, due: b.total - b.paid }))

export function todayOps(s: DemoState, now = new Date()) {
  const today = isoDate(now)
  const pickupsToday = s.bookings.filter((b) => isoDate(b.start) === today && ['pending', 'confirmed', 'active'].includes(b.status))
  const dueBack = s.bookings.filter((b) => b.status === 'active' && isoDate(b.end) === today && new Date(b.end) >= now)
  const overdue = s.bookings.filter((b) => b.status === 'active' && new Date(b.end) < now)
  const carsOut = s.bookings.filter((b) => b.status === 'active')
  return { pickupsToday, dueBack, overdue, carsOut }
}

export function depositSummary(s: DemoState) {
  const held = s.bookings.filter((b) => b.depositStatus === 'held').reduce((a, b) => a + b.deposit, 0)
  const refunded = s.bookings.filter((b) => b.depositStatus === 'refunded').reduce((a, b) => a + b.deposit, 0)
  const deductedAmt = s.bookings.reduce((a, b) => a + b.deductions.reduce((x, d) => x + d.amount, 0), 0)
  return { held, refunded, deducted: deductedAmt }
}

export const bookingsForCar = (s: DemoState, car: Car) => s.bookings.filter((b) => b.carId === car.id)
export const isLive = (b: Booking) => ['pending', 'confirmed', 'active'].includes(b.status)
