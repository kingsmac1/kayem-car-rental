/**
 * Real branded emails from the demo, sent through the `demo-email` Supabase Edge
 * Function (supabase/functions/demo-email). Only addresses a visitor typed in get
 * mail: the seeded sample people use `.demo` addresses and are skipped, so staff
 * actions on sample bookings never email anyone.
 *
 * Calls never throw and never block the UI; a failed or rate-limited send is
 * logged and the demo carries on as if it went.
 */
import { brand } from '@/config/brand'
import { db } from '@/lib/db'
import { quote } from '@/lib/pricing'
import { locationName } from '@/mocks/locations'
import type { Booking, Car } from '@/mocks/types'

const FUNCTION_URL = import.meta.env.VITE_SUPABASE_URL ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/demo-email` : ''

export type EnquiryKind = 'contact' | 'corporate' | 'partner'

/** True for an address a person typed in, false for seeded sample data. */
export const isRealAddress = (email?: string) => !!email && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) && !/\.demo$/i.test(email)

async function send(template: string, to: string | undefined, data: unknown): Promise<boolean> {
  if (!FUNCTION_URL || !isRealAddress(to)) return false
  try {
    const res = await fetch(FUNCTION_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ template, to, data }) })
    if (!res.ok) console.info(`[email] ${template} not sent:`, (await res.json().catch(() => ({}))).reason ?? res.status)
    return res.ok
  } catch (err) {
    console.info(`[email] ${template} not sent:`, err)
    return false
  }
}

/** Emails show JPG copies of the car photos (public/email/cars), since Outlook can't show WebP. */
function carInfo(car: Car) {
  const file = car.image.split('/').pop()?.replace(/\.webp$/, '.jpg')
  return { name: `${car.make} ${car.model}`, plate: car.plate, image: file ? `${brand.siteUrl}/email/cars/${file}` : undefined }
}

function context(bookingId: string) {
  const s = db.get()
  const b = s.bookings.find((x) => x.id === bookingId)
  const customer = b && s.customers.find((c) => c.id === b.customerId)
  const car = b && s.cars.find((c) => c.id === b.carId)
  if (!b || !customer || !car || !isRealAddress(customer.email)) return null
  return { s, b, customer, car }
}

const refundable = (b: Booking) => b.paid + (b.depositStatus === 'held' ? b.deposit : 0)

export const emailService = {
  isRealAddress,

  bookingConfirmed(bookingId: string) {
    const x = context(bookingId)
    if (!x) return Promise.resolve(false)
    const { s, b, customer, car } = x
    const q = quote({ car, start: new Date(b.start), end: new Date(b.end), mode: b.mode, extras: b.extras, promo: b.promo, corporate: !!b.corporateId, rules: s.pricing })
    return send('booking_confirmed', customer.email, {
      name: customer.name,
      ref: b.ref,
      car: carInfo(car),
      start: b.start,
      end: b.end,
      pickup: locationName(b.pickup),
      dropoff: locationName(b.dropoff),
      mode: b.mode,
      chauffeurName: s.chauffeurs.find((c) => c.id === b.chauffeurId)?.name,
      lines: q.lines,
      total: b.total,
      paid: b.paid,
      deposit: b.deposit,
    })
  },

  bookingExtended(bookingId: string, days: number, previousEnd: string, extra: number) {
    const x = context(bookingId)
    if (!x) return Promise.resolve(false)
    const { b, customer, car } = x
    return send('booking_extended', customer.email, {
      name: customer.name, ref: b.ref, car: carInfo(car), days, previousEnd, newEnd: b.end, dropoff: locationName(b.dropoff), extra, total: b.total,
    })
  },

  /** Call with the booking as it was before cancelling, so the refund includes a held deposit. */
  bookingCancelled(before: Booking) {
    const x = context(before.id)
    if (!x) return Promise.resolve(false)
    return send('booking_cancelled', x.customer.email, { name: x.customer.name, ref: before.ref, car: carInfo(x.car), start: before.start, refund: refundable(before) })
  },

  pickupReminder(bookingId: string) {
    const x = context(bookingId)
    if (!x) return Promise.resolve(false)
    const { s, b, customer, car } = x
    const driver = s.chauffeurs.find((c) => c.id === b.chauffeurId)
    return send('pickup_reminder', customer.email, {
      name: customer.name, ref: b.ref, car: carInfo(car), start: b.start, pickup: locationName(b.pickup), mode: b.mode,
      chauffeur: driver ? { name: driver.name, phone: driver.phone } : undefined,
    })
  },

  returnReminder(bookingId: string) {
    const x = context(bookingId)
    if (!x) return Promise.resolve(false)
    return send('return_reminder', x.customer.email, { name: x.customer.name, ref: x.b.ref, car: carInfo(x.car), end: x.b.end, dropoff: locationName(x.b.dropoff) })
  },

  depositSettled(bookingId: string) {
    const x = context(bookingId)
    if (!x) return Promise.resolve(false)
    return send('deposit_refunded', x.customer.email, { name: x.customer.name, ref: x.b.ref, deposit: x.b.deposit, deductions: x.b.deductions.map(({ label, amount }) => ({ label, amount })), method: 'The card you paid with' })
  },

  reviewRequest(bookingId: string) {
    const x = context(bookingId)
    if (!x) return Promise.resolve(false)
    return send('review_request', x.customer.email, { name: x.customer.name, ref: x.b.ref, car: carInfo(x.car) })
  },

  welcome(name: string, email: string, points: number) {
    return send('welcome', email, { name, points })
  },

  /** Thanks the sender and forwards the enquiry to the business owner. */
  enquiry(kind: EnquiryKind, email: string, name: string, fields: Array<[string, string]>, message?: string) {
    return send('enquiry_received', email, { kind, name, fields, message })
  },
}
