import { brand } from '@/config/brand'
import { createRng } from '@/lib/seed'
import { DAY, startOfDay } from '@/lib/utils'
import { buildCars, carName } from './cars'
import { locations } from './locations'
import { chauffeurSeeds, corporateSeeds, customerSeeds, partnerSeeds, reviewTexts, staffSeeds } from './people'
import type {
  Alert, AuditEntry, Booking, BookingStatus, Car, Chauffeur, Conversation, CorporateAccount, Customer,
  DemoState, Inspection, MaintenanceRecord, PartnerOwner, PricingRules, Referral, Review, Staff,
} from './types'
import { images } from '@/data/images'

export const DEMO_VERSION = 4
const SEED = 20260614

const phone = (n: number) => `+234 ${[803, 806, 813, 816, 703, 706, 810, 905, 908, 802][n % 10]} ${String(100 + ((n * 389) % 899))} ${String(1000 + ((n * 7331) % 8999))}`
const slug = (name: string) => name.toLowerCase().replace(/[^a-z]+/g, '.')

/** Builds the full demo dataset relative to `now`. Same seed → same data every time. */
export function generateDemoState(now = new Date()): DemoState {
  const rng = createRng(SEED)
  const today = startOfDay(now)
  const at = (dayOffset: number, hour = 10, minute = 0) => {
    const d = new Date(today.getTime() + dayOffset * DAY)
    d.setHours(hour, minute, 0, 0)
    return d.toISOString()
  }

  const cars = buildCars(today)

  // ---- customers
  const customers: Customer[] = customerSeeds.map((c, i) => {
    const verification = i === 7 ? 'review' : i === 14 ? 'failed' : i === 33 ? 'none' : i === 40 ? 'review' : 'verified'
    const blacklisted = i === 14
    return {
      id: `c-${i + 1}`,
      name: c.name,
      phone: phone(i + 11),
      email: `${slug(c.name)}@mail.demo`,
      city: c.city,
      verification,
      verificationDetail:
        verification === 'none' ? undefined :
        { nin: verification === 'failed' ? 'mismatch' : verification === 'review' ? 'pending' : 'match', licence: verification === 'failed' ? 'expired' : 'valid', selfie: verification === 'failed' ? 41 : verification === 'review' ? 72 : 90 + (i % 9) },
      risk: blacklisted ? 'high' : i % 11 === 5 ? 'medium' : 'low',
      riskFlags: blacklisted ? ['NIN mismatch', 'Returned car 2 days late', 'Unpaid fuel charge'] : i % 11 === 5 ? ['Late return last trip'] : [],
      blacklist: blacklisted ? { reason: 'Tampered with GPS tracker and returned car 2 days late without contact.', date: at(-40), by: 'Bisola Adekunle' } : undefined,
      notes: i === 0 ? ['Prefers Prado, always airport pickups at MMA2.'] : i === 2 ? ['VIP — embassy guest, chauffeur only.'] : [],
      corporateId: i === 2 ? 'co-embassy' : i === 21 ? 'co-zenith' : i === 9 ? 'co-oil' : undefined,
      joined: at(-rng.int(30, 700)),
      referralCode: `${c.name.split(' ')[0].toUpperCase().slice(0, 5)}${(i * 37) % 90 + 10}`,
      points: rng.int(0, 4200),
    }
  })

  // ---- chauffeurs
  const chauffeurs: Chauffeur[] = chauffeurSeeds.map((c, i) => ({
    id: `d-${i + 1}`,
    name: c.name,
    phone: phone(i + 70),
    city: c.city,
    rating: Math.round((4.5 + rng.next() * 0.5) * 10) / 10,
    trips: rng.int(120, 900),
    available: i !== 4,
    languages: c.languages,
    years: c.years,
    licenceExpiry: at(rng.int(60, 700)),
    payoutPending: rng.int(4, 18) * 5000,
    earningsMonth: rng.int(180, 420) * 1000,
  }))

  // ---- bookings
  const bookings: Booking[] = []
  const locsBy = (city: string) => locations.filter((l) => l.city === city)
  const extrasPool = ['Child seat', 'Extra driver', 'Interstate permit', 'Security escort']
  const channels: Booking['channel'][] = ['website', 'whatsapp', 'whatsapp', 'website', 'phone', 'walk-in', 'corporate']
  let refN = 4100

  // Planned slots per car so bookings never overlap: walk each car's timeline.
  const bookable = cars.filter((c) => c.id !== 'coaster-abj' || true)
  for (const car of bookable) {
    let cursor = -rng.int(55, 70) // days relative to today
    let guard = 0
    while (cursor < 40 && guard++ < 12) {
      const gap = rng.int(0, 6)
      const start = cursor + gap
      const len = car.category === 'Bus' ? rng.int(1, 3) : rng.int(1, 7)
      const end = start + len
      if (start > 40) break
      cursor = end + 1
      // Keep some cars free right now so the fleet isn't fully booked.
      if (start <= 0 && end >= 0 && ['camry-lag', 'rr-lag', 'elantra-lag', 'gls-abj', 'coaster-abj', 'cx5-phc'].includes(car.id)) continue
      if (rng.chance(0.25)) continue

      const cityCustomers = customers.filter((c) => c.city === car.city && !c.blacklist)
      const customer = rng.pick(cityCustomers.length ? cityCustomers : customers)
      const locs = locsBy(car.city)
      const pickup = rng.chance(0.45) ? locs.find((l) => l.kind === 'airport')! : rng.pick(locs)
      const dropoff = rng.chance(0.7) ? pickup : rng.pick(locs)
      const mode = car.modes.length === 1 ? car.modes[0] : rng.chance(0.4) ? 'chauffeur' : 'self-drive'
      const cityDrivers = chauffeurs.filter((d) => d.city === car.city)
      const extras = rng.chance(0.35) ? [rng.pick(extrasPool)] : []
      const days = Math.max(1, end - start)
      const base = days >= 7 ? Math.round((car.rates.weekly / 7) * days) : car.rates.daily * days
      const chauffeurFee = mode === 'chauffeur' ? 25000 * days : 0
      const extrasFee = extras.length * 10000 * days
      const total = Math.round((base + chauffeurFee + extrasFee) / 500) * 500

      let status: BookingStatus
      if (end < 0) status = rng.chance(0.85) ? 'closed' : 'returned'
      else if (start <= 0 && end >= 0) status = 'active'
      else status = rng.chance(0.75) ? 'confirmed' : 'pending'
      if (status !== 'active' && rng.chance(0.06)) status = 'cancelled'

      const corporate = customer.corporateId ?? (rng.chance(0.12) ? rng.pick(corporateSeeds.filter((c) => c.city === car.city) as unknown as { id: string }[])?.id : undefined)
      const id = `b-${refN}`
      const deductions: Booking['deductions'] =
        status === 'closed' && rng.chance(0.18)
          ? [rng.pick([
              { label: 'Scratch on rear bumper', amount: 45000, kind: 'damage' as const, photo: images.scenes.lcDetail },
              { label: 'Fuel shortfall (¼ tank)', amount: 22000, kind: 'fuel' as const },
              { label: 'Late return (3 hrs)', amount: 30000, kind: 'late' as const },
              { label: 'LASTMA fine — wrong lane', amount: 25000, kind: 'fine' as const },
            ])]
          : []
      bookings.push({
        id,
        ref: `${brand.refPrefix}-${refN++}`,
        carId: car.id,
        customerId: customer.id,
        start: at(start, rng.pick([7, 8, 9, 10, 12, 14, 16])),
        end: at(end, rng.pick([9, 10, 12, 15, 18])),
        pickup: pickup.id,
        dropoff: dropoff.id,
        mode,
        chauffeurId: mode === 'chauffeur' && cityDrivers.length ? rng.pick(cityDrivers).id : undefined,
        extras,
        status,
        total,
        paid: status === 'pending' ? 0 : status === 'confirmed' && rng.chance(0.3) ? Math.round(total * 0.5) : total,
        deposit: car.deposit,
        depositStatus: status === 'closed' ? (deductions.length ? 'deducted' : 'refunded') : status === 'pending' || status === 'cancelled' ? 'pending' : 'held',
        deductions,
        channel: corporate ? 'corporate' : rng.pick(channels),
        createdAt: at(start - rng.int(1, 12), rng.int(8, 21)),
        corporateId: corporate,
        rating: status === 'closed' && rng.chance(0.6) ? rng.int(4, 5) : undefined,
      })
    }
  }

  // Guarantee demo moments: one overdue rental, one due back today, one pickup today.
  const overdueCar = cars.find((c) => c.id === 'accord-abj')!
  bookings.push({
    id: 'b-overdue', ref: `${brand.refPrefix}-${refN++}`, carId: overdueCar.id, customerId: 'c-23', start: at(-5, 9), end: at(-1, 18),
    pickup: 'abv-intl', dropoff: 'abj-wuse', mode: 'self-drive', extras: [], status: 'active', total: overdueCar.rates.daily * 4,
    paid: overdueCar.rates.daily * 4, deposit: overdueCar.deposit, depositStatus: 'held', deductions: [], channel: 'whatsapp', createdAt: at(-7, 13),
  })
  const dueTodayCar = cars.find((c) => c.id === 'camry-lag')!
  bookings.push({
    id: 'b-duetoday', ref: `${brand.refPrefix}-${refN++}`, carId: dueTodayCar.id, customerId: 'c-1', start: at(-3, 10), end: at(0, 17),
    pickup: 'los-mma2', dropoff: 'los-mma2', mode: 'self-drive', extras: ['Child seat'], status: 'active', total: dueTodayCar.rates.daily * 3 + 30000,
    paid: dueTodayCar.rates.daily * 3 + 30000, deposit: dueTodayCar.deposit, depositStatus: 'held', deductions: [], channel: 'website', createdAt: at(-6, 11),
  })
  const pickupTodayCar = cars.find((c) => c.id === 'rr-lag')!
  bookings.push({
    id: 'b-pickuptoday', ref: `${brand.refPrefix}-${refN++}`, carId: pickupTodayCar.id, customerId: 'c-5', start: at(0, 15), end: at(2, 15),
    pickup: 'lag-vi', dropoff: 'lag-vi', mode: 'chauffeur', chauffeurId: 'd-1', extras: ['Security escort'], status: 'confirmed',
    total: pickupTodayCar.rates.daily * 2 + 50000 + 20000, paid: pickupTodayCar.rates.daily * 2 + 70000, deposit: pickupTodayCar.deposit, depositStatus: 'held', deductions: [], channel: 'whatsapp', createdAt: at(-2, 20),
  })

  // Drop generated bookings that would clash with the guaranteed ones (and anything after the overdue car's return).
  const forced = bookings.slice(-3)
  for (let k = bookings.length - 4; k >= 0; k--) {
    const b = bookings[k]
    const clash = forced.some((f) => f.carId === b.carId && new Date(b.start) <= new Date(f.end) && new Date(b.end) >= new Date(f.start))
    const afterOverdue = b.carId === 'accord-abj' && new Date(b.end) >= new Date(at(-6))
    if (clash || afterOverdue) bookings.splice(k, 1)
  }

  // ---- car statuses from bookings + maintenance
  const activeCarIds = new Set(bookings.filter((b) => b.status === 'active').map((b) => b.carId))
  for (const car of cars) {
    if (activeCarIds.has(car.id)) car.status = 'rented'
  }
  const gle = cars.find((c) => c.id === 'glecoupe-lag')!
  if (!activeCarIds.has(gle.id)) { gle.status = 'maintenance' }

  // ---- corporates
  const corporates: CorporateAccount[] = corporateSeeds.map((c, i) => {
    const spent = bookings.filter((b) => b.corporateId === c.id && b.status !== 'cancelled').reduce((s, b) => s + b.total, 0)
    return {
      ...c,
      kind: c.kind,
      city: c.city,
      balance: Math.round(spent * 0.35 / 1000) * 1000,
      bookers: [
        { name: c.contact, email: c.email, role: 'Admin' },
        { name: ['Kemi Ojo', 'Lars Berg', 'Amaka Ude', 'Dayo Phillips', 'Boma Jack'][i], email: `assistant@${c.email.split('@')[1]}`, role: 'Booker' },
      ],
      since: at(-rng.int(90, 600)),
    }
  })

  // ---- partners
  const partners: PartnerOwner[] = partnerSeeds.map((p, i) => ({
    ...p,
    phone: phone(i + 120),
    email: `${slug(p.name)}@mail.demo`,
    joined: at(-rng.int(20, 400)),
    payoutPending: p.status === 'approved' ? rng.int(15, 60) * 10000 : 0,
    paidOut: p.status === 'approved' ? rng.int(80, 400) * 10000 : 0,
    pendingCar: p.status === 'pending' ? (i === 3 ? { make: 'Toyota', model: 'Highlander', year: 2021 } : { make: 'Lexus', model: 'ES 350', year: 2022 }) : undefined,
  }))

  // ---- maintenance history
  const vendors = ['Toyota Nigeria Service, Ikeja', 'Coscharis Motors, VI', 'Elizade Autoland, Abuja', 'Precious Auto Garage, PH', 'Mercedes-Benz Weststar, Lagos']
  const maintenance: MaintenanceRecord[] = []
  cars.forEach((car, i) => {
    const n = rng.int(2, 4)
    for (let k = 0; k < n; k++) {
      const kind = rng.pick(['Service', 'Service', 'Repair', 'Tyres', 'Body work', 'Inspection'] as const)
      const cost = kind === 'Service' ? rng.int(8, 25) * 5000 : kind === 'Tyres' ? rng.int(30, 80) * 5000 : kind === 'Body work' ? rng.int(20, 90) * 5000 : kind === 'Repair' ? rng.int(15, 120) * 5000 : 25000
      maintenance.push({
        id: `m-${i}-${k}`,
        carId: car.id,
        date: at(-rng.int(5, 300)),
        kind,
        description: {
          Service: 'Oil, filters and full check', Repair: rng.pick(['Brake pads replaced', 'AC compressor repair', 'Suspension bushings', 'Alternator replaced']),
          Tyres: 'Four new tyres + alignment', 'Body work': rng.pick(['Rear bumper respray', 'Side mirror replaced', 'Door ding repair']), Inspection: 'Roadworthiness inspection',
        }[kind],
        km: car.mileage - rng.int(500, 20000),
        cost,
        vendor: rng.pick(vendors),
      })
    }
  })
  maintenance.push({ id: 'm-gle-now', carId: 'glecoupe-lag', date: at(-1), kind: 'Repair', description: 'Air suspension compressor — in workshop', km: gle.mileage, cost: 380000, vendor: 'Mercedes-Benz Weststar, Lagos' })

  // ---- conversations (WhatsApp inbox)
  const conv = (id: string, name: string, n: number, status: Conversation['status'], topic: string, minsAgo: number, msgs: [Conversation['messages'][number]['from'], string][]): Conversation => ({
    id, customerName: name, phone: phone(n), status, topic, unread: status === 'needs-human' ? 2 : status === 'bot' ? 1 : 0,
    updatedAt: new Date(now.getTime() - minsAgo * 60000).toISOString(),
    messages: msgs.map(([from, text], k) => ({ id: `${id}-${k}`, from, text, at: new Date(now.getTime() - (minsAgo + (msgs.length - k) * 2) * 60000).toISOString() })),
  })
  const conversations: Conversation[] = [
    conv('w-1', 'Chiamaka Okonkwo', 11, 'bot', 'Availability', 3, [
      ['customer', 'Hi, do you have a Prado in Lagos for this weekend?'],
      ['bot', 'Hi Chiamaka 👋 Yes — the Prado TXL (2022) is free Saturday to Sunday in Lagos at ₦150,000/day. Want me to hold it?'],
      ['customer', 'Yes please, pickup at MMA2 Saturday 9am'],
    ]),
    conv('w-2', 'Ibrahim Musa', 16, 'needs-human', 'Breakdown', 9, [
      ['customer', 'The car is showing engine light on the Kubwa expressway'],
      ['bot', 'Sorry about that, Ibrahim. Please pull over safely. I can see the Land Cruiser V8 stopped near Kubwa. A recovery team is being alerted.'],
      ['customer', 'Please I need someone to call me'],
      ['bot', 'Handing you over to our duty manager now. Expect a call within 5 minutes.'],
    ]),
    conv('w-3', 'Gold Ribbon Events', 99, 'human', 'Wedding convoy', 34, [
      ['customer', 'We need 4 black SUVs + 1 Escalade for a wedding on the 14th, Ikoyi'],
      ['bot', 'Lovely! I can quote that now — 4× Lexus/Mercedes SUVs and the Escalade with chauffeurs. Shall I pass this to our events desk for a package price?'],
      ['agent', `Hi Tolu, Grace here from ${brand.shortName}. Sending a package quote with ribbons and coordinator in 10 mins.`],
    ]),
    conv('w-4', 'Halima Abubakar', 19, 'bot', 'Extension', 58, [
      ['customer', 'Can I extend the Camry by 2 more days?'],
      ['bot', `Done ✅ The Camry is free. 2 extra days = ₦110,000. Here is your payment link: pay.${brand.slug}.demo/${brand.refPrefix}-4192`],
    ]),
    conv('w-5', 'Tamunotonye Briggs', 20, 'closed', 'Airport pickup', 190, [
      ['customer', 'Landing PHC 4pm tomorrow, need a car'],
      ['bot', `Booked ✅ Range Rover Sport, PHC airport arrivals at 4pm. Ref ${brand.refPrefix}-4177.`],
      ['customer', 'Thanks!'],
    ]),
    conv('w-6', 'Unknown +234 905…', 33, 'needs-human', 'Price negotiation', 15, [
      ['customer', 'How much for S-Class for 1 month? Can you do discount'],
      ['bot', 'The S 580 is chauffeur-only at ₦9,240,000/month. For discounts on long stays I will connect you to a manager.'],
    ]),
  ]

  // ---- pricing
  const year = today.getFullYear()
  const pricing: PricingRules = {
    seasons: [
      { id: 'xmas', name: 'December festive season', from: `${year}-12-15`, to: `${year + 1}-01-05`, uplift: 0.3, active: true },
      { id: 'easter', name: 'Easter weekend', from: easterRange(year + (today.getMonth() > 3 ? 1 : 0))[0], to: easterRange(year + (today.getMonth() > 3 ? 1 : 0))[1], uplift: 0.15, active: true },
      { id: 'sallah', name: 'Sallah public holidays', from: `${year + 1}-03-20`, to: `${year + 1}-03-23`, uplift: 0.15, active: true },
      { id: 'detty', name: '“Detty December” concerts (Lagos)', from: `${year}-12-20`, to: `${year}-12-31`, uplift: 0.2, active: true },
      { id: 'independence', name: 'Independence Day', from: `${year + 1}-10-01`, to: `${year + 1}-10-01`, uplift: 0.1, active: false },
    ],
    weekendUplift: 0.1,
    eventUplift: 0.2,
    sameDayPremium: 0.1,
    longStay: [{ minDays: 7, discount: 0.08 }, { minDays: 14, discount: 0.12 }, { minDays: 28, discount: 0.2 }],
    corporateDiscount: 0.12,
    loyaltyDiscount: 0.05,
    promos: [
      { code: 'WELCOME10', discount: 0.1, uses: 48, limit: 200, expires: at(60), active: true },
      { code: 'DETTYDEC', discount: 0.07, uses: 12, limit: 100, expires: at(80), active: true },
      { code: 'AIRPORT5', discount: 0.05, uses: 131, limit: 300, expires: at(20), active: true },
      { code: 'EASTER15', discount: 0.15, uses: 60, limit: 60, expires: at(-30), active: false },
    ],
  }

  // ---- staff, audit, alerts
  const staff: Staff[] = staffSeeds.map((s) => ({ ...s, active: true }))
  const actions = [
    `Confirmed booking ${brand.refPrefix}-4123`, `Refunded deposit for ${brand.refPrefix}-4108`, 'Blocked Toyota Coaster — service overdue', 'Added note to Chiamaka Okonkwo',
    'Changed festive season uplift to 30%', 'Created promo code DETTYDEC', `Assigned Sunday Okeke to ${brand.refPrefix}-4131`, 'Approved partner Adaeze Nwachukwu',
    'Exported finance CSV', 'Marked inspection complete for Prado TXL', 'Blacklisted Sodiq Lawal', `Extended ${brand.refPrefix}-4155 by 2 days`,
  ]
  const audit: AuditEntry[] = actions.map((a, i) => {
    const s = staff[i % staff.length]
    return { id: `a-${i}`, at: new Date(now.getTime() - (i * 7 + 2) * 3600_000).toISOString(), actor: s.name, role: s.role, action: a }
  })

  const alerts: Alert[] = [
    { id: 'al-1', at: new Date(now.getTime() - 4 * 60000).toISOString(), level: 'bad', kind: 'overdue', carId: 'accord-abj', bookingId: 'b-overdue', text: 'Honda Accord Sport is overdue — was due back yesterday 6pm.', read: false },
    { id: 'al-2', at: new Date(now.getTime() - 12 * 60000).toISOString(), level: 'warn', kind: 'overspeed', carId: 'prado-lag', text: 'Prado TXL hit 138 km/h on Lekki-Epe Expressway.', read: false },
    { id: 'al-3', at: new Date(now.getTime() - 50 * 60000).toISOString(), level: 'bad', kind: 'document', carId: 'yukon-phc', text: 'GMC Yukon Denali vehicle licence expired — car blocked from booking.', read: false },
    { id: 'al-4', at: new Date(now.getTime() - 95 * 60000).toISOString(), level: 'warn', kind: 'service', carId: 'coaster-abj', text: 'Toyota Coaster is 1,400 km past its service interval — blocked.', read: true },
    { id: 'al-5', at: new Date(now.getTime() - 3 * 3600000).toISOString(), level: 'info', kind: 'verification', text: 'Oluwaseun Ajayi’s selfie match needs manual review (72%).', read: true },
    { id: 'al-6', at: new Date(now.getTime() - 5 * 3600000).toISOString(), level: 'warn', kind: 'payment', text: '3 bookings have unpaid balances totalling ₦540,000.', read: true },
    { id: 'al-7', at: new Date(now.getTime() - 9 * 3600000).toISOString(), level: 'warn', kind: 'night', carId: 'corolla-lag', text: 'Toyota Corolla driven at 2:14am in Ikeja — outside allowed hours.', read: true },
  ]

  // ---- reviews & referrals
  const closed = bookings.filter((b) => b.status === 'closed')
  const reviews: Review[] = closed.slice(0, 14).map((b, i) => ({
    id: `r-${i}`, bookingId: b.id, customerId: b.customerId, rating: b.rating ?? 5, text: i % 3 === 2 ? '' : reviewTexts[i % reviewTexts.length],
    requested: b.end, status: i % 3 === 2 ? 'requested' : 'reviewed',
  }))
  const referrals: Referral[] = Array.from({ length: 9 }, (_, i) => ({
    id: `rf-${i}`, referrerId: customers[(i * 5) % customers.length].id, friend: customers[(i * 7 + 3) % customers.length].name,
    date: at(-rng.int(2, 120)), status: (['signed-up', 'booked', 'rewarded'] as const)[i % 3], reward: 10000,
  }))

  // ---- inspections for the demo comparison
  const sampleBooking = bookings.find((b) => b.id === 'b-duetoday')!
  const inspections: Inspection[] = [
    {
      id: 'i-1', bookingId: sampleBooking.id, carId: sampleBooking.carId, kind: 'check-out', at: sampleBooking.start, by: 'Joseph Eze', mileage: 29640, fuel: 100,
      photos: { front: images.cars.camry, rear: images.scenes.toyotaFront, left: images.cars.camry, right: images.cars.camry, interior: images.scenes.interior, dashboard: images.scenes.corollaWheel },
      damages: [], notes: 'Clean. Full tank. Child seat fitted.',
    },
  ]

  const settings = {
    depositRule: 'Refundable deposit held on card or transfer. Refunded within 24 hours of a clean return; damage, fuel, fines and late fees are deducted with photo evidence.',
    fuelPolicy: 'Full-to-full. Shortfall charged at ₦1,100 per litre plus ₦5,000 service fee.',
    lateFeePerHour: 10000,
    graceMinutes: 59,
    minAge: 23,
    cancellationHours: 24,
  }

  return {
    version: DEMO_VERSION,
    savedOn: today.toISOString(),
    cars, customers, bookings, chauffeurs, corporates, partners, maintenance, conversations, pricing, audit, staff, alerts, reviews, referrals, inspections, settings,
  }
}

/** Good Friday → Easter Monday for a year (anonymous Gregorian algorithm). */
function easterRange(y: number): [string, string] {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1
  const easter = new Date(y, month - 1, day)
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return [iso(new Date(easter.getTime() - 2 * DAY)), iso(new Date(easter.getTime() + DAY))]
}
export { easterRange }

export const describeCar = (c: Car) => `${carName(c)} (${c.year})`
