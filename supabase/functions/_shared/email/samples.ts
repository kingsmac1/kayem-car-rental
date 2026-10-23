/** Realistic sample data for previews and test sends. Dates are relative to now. */
import { brand } from './ui.ts'
import type { TemplateData, TemplateName } from './templates.ts'

const H = 3_600_000
/** Hours from 10:00 Lagos time (09:00 UTC) today, so previews show tidy times. */
const at = (hours: number) => {
  const base = new Date()
  base.setUTCHours(9, 0, 0, 0)
  return new Date(base.getTime() + hours * H).toISOString()
}
const site = brand.siteUrl
const car = { name: 'Toyota Land Cruiser 300', plate: 'LND-482-KJ', image: `${site}/email/cars/land-cruiser.jpg` }

export const samples: { [T in TemplateName]: TemplateData<T> } = {
  booking_confirmed: {
    name: 'Chiamaka Okonkwo',
    ref: `${brand.refPrefix}-4127`,
    car,
    start: at(48),
    end: at(48 + 72),
    pickup: 'Murtala Muhammed Airport, Arrivals',
    dropoff: '14 Admiralty Way, Lekki Phase 1',
    mode: 'self-drive',
    lines: [{ label: '3 days × ₦260,000', amount: 780000 }, { label: 'Child seat', amount: 30000 }, { label: 'Promo WELCOME10', amount: -78000 }],
    total: 732000,
    paid: 732000,
    deposit: 300000,
    manageUrl: `${site}/account`,
  },
  pickup_reminder: {
    name: 'Tunde Bakare',
    ref: `${brand.refPrefix}-4131`,
    car: { name: 'Mercedes-Benz S 580', plate: 'ABJ-221-MB' },
    start: at(20),
    pickup: 'Transcorp Hilton, Abuja',
    mode: 'chauffeur',
    chauffeur: { name: 'Ibrahim Musa', phone: '+234 803 555 0142' },
    manageUrl: `${site}/account`,
  },
  return_reminder: {
    name: 'Chiamaka Okonkwo',
    ref: `${brand.refPrefix}-4127`,
    car,
    end: at(2),
    dropoff: '14 Admiralty Way, Lekki Phase 1',
    extendUrl: `${site}/account`,
  },
  deposit_refunded: {
    name: 'Chiamaka Okonkwo',
    ref: `${brand.refPrefix}-4127`,
    deposit: 300000,
    deductions: [{ label: 'Fuel top-up (quarter tank)', amount: 18500 }],
    method: 'Card ending 4081',
    detailsUrl: `${site}/account`,
  },
  review_request: {
    name: 'Chiamaka Okonkwo',
    ref: `${brand.refPrefix}-4127`,
    car,
    reviewUrl: 'https://g.page/r/review',
  },
  booking_extended: {
    name: 'Chiamaka Okonkwo',
    ref: `${brand.refPrefix}-4127`,
    car,
    days: 2,
    previousEnd: at(72),
    newEnd: at(120),
    dropoff: '14 Admiralty Way, Lekki Phase 1',
    extra: 520000,
    total: 1252000,
    manageUrl: `${site}/account`,
  },
  booking_cancelled: {
    name: 'Chiamaka Okonkwo',
    ref: `${brand.refPrefix}-4127`,
    car,
    start: at(48),
    refund: 732000,
    bookUrl: `${site}/fleet`,
  },
  welcome: { name: 'Chiamaka Okonkwo', points: 500, fleetUrl: `${site}/fleet` },
  enquiry_received: { kind: 'corporate', name: 'Ronke Adesina' },
  new_enquiry: {
    kind: 'corporate',
    fields: [['Company', 'Lekki Capital Partners'], ['Name', 'Ronke Adesina'], ['Email', 'travel@lekkicapital.com'], ['Phone', '+234 802 555 0199'], ['City', 'Lagos'], ['Volume', '5–20 trips a month']],
    message: 'We host visiting partners every month and need airport pickups with a chauffeur, mostly Land Cruisers.',
    adminUrl: `${site}/admin`,
  },
  owner_daily_summary: {
    date: at(0),
    revenue: 4_860_000,
    revenueChange: 0.12,
    newBookings: 9,
    pickups: 6,
    returns: 4,
    utilisation: 0.74,
    needsAttention: ['KYM-4119 is 3 hours late returning (Lexus GX 460)', 'Insurance on ABJ-221-MB expires in 6 days', '2 WhatsApp chats waiting for a person'],
    dashboardUrl: `${site}/admin`,
  },
  alert: {
    title: 'Car left its geofence',
    detail: 'Toyota Prado LND-118-PR crossed the Lagos boundary on the Lagos–Ibadan Expressway. Interstate travel is not on this booking.',
    severity: 'bad',
    ref: `${brand.refPrefix}-4122`,
    car: 'Toyota Prado · LND-118-PR',
    at: at(-0.2),
    actionLabel: 'Open Fleet Command',
    actionUrl: `${site}/admin/command`,
  },
  auth_magic_link: {},
  auth_confirm_signup: {},
}
