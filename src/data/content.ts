import { brand } from '@/config/brand'
import { images } from './images'
import { easterRange } from '@/mocks/generate'
import { startOfDay } from '@/lib/utils'

/** Site copy that isn't brand config. Edit freely per client. */

export const services = [
  { id: 'self-drive', title: 'Self-drive', body: 'Verified once, then just book and go. Full-to-full fuel, unlimited city mileage.', from: 45000, image: images.cars.camry, link: { to: '/fleet', search: { mode: 'self-drive' } } },
  { id: 'chauffeur', title: 'Chauffeur', body: 'Vetted, uniformed drivers who know every shortcut from Lekki to Ikeja.', from: 70000, image: images.scenes.interior, link: { to: '/fleet', search: { mode: 'chauffeur' } } },
  { id: 'airport', title: 'Airport transfers', body: 'Flight-tracked pickups at LOS, MMA2, ABV and PHC. We wait if you’re late.', from: 35000, image: images.scenes.lagosNight, link: { to: '/book', search: {} } },
  { id: 'interstate', title: 'Interstate trips', body: 'Lagos–Ibadan, Abuja–Kaduna, PH–Owerri with permits and optional escort.', from: 150000, image: images.cars.landCruiserDesert, link: { to: '/fleet', search: { type: 'SUV' } } },
  { id: 'events', title: 'Weddings & events', body: 'Matching convoys, ribbons and a coordinator on the day. Escalade included.', from: 420000, image: images.scenes.wedding, link: { to: '/contact', search: {} } },
  { id: 'corporate', title: 'Corporate', body: 'Monthly invoicing, staff bookers and credit terms for teams and embassies.', from: 0, image: images.cars.sClass, link: { to: '/business', search: {} } },
] as const

export const pillars = [
  { title: 'Verified and safe', body: 'Every driver passes a NIN check, licence check and a live selfie match before the keys move. No verification, no car.', detail: 'Selfie match 90%+ required' },
  { title: 'Tracked fleet', body: 'Every car reports its position every few seconds. If a car leaves its approved area, we know before you do.', detail: 'GPS + geofence on all cars' },
  { title: 'Transparent damage process', body: 'Photo walkaround at pick-up and return. Any deduction from your deposit comes with before-and-after photos.', detail: 'Deposits refunded within 24 h' },
  { title: '24/7 on WhatsApp', body: 'Book, extend, report a breakdown or reach a human any time — on the app you already use.', detail: 'Median reply under a minute' },
] as const

export const chapters = [
  { n: 1, title: 'Choose', body: 'Pick a car, dates and pick-up point — including airport arrivals. See the full price with deposit before you commit. No hidden extras.', image: images.cars.rangeRover, caption: 'Real-time availability' },
  { n: 2, title: 'Verify', body: 'Enter your NIN, snap your licence and take a quick live selfie. Sign the rental agreement on your phone. Returning customers skip this.', image: images.scenes.interior2, caption: 'Two minutes, once' },
  { n: 3, title: 'Drive', body: 'Collect the car after a photo walkaround, or meet your chauffeur. Extend or get help on WhatsApp. Return it and your deposit comes back fast.', image: images.scenes.wetStreet, caption: 'Tracked, insured, supported' },
] as const

export const testimonials = [
  { quote: 'Landed at MMA2 at midnight and the Prado was waiting, spotless. Booking took five minutes on WhatsApp.', name: 'Chiamaka O.', role: 'Lagos, self-drive' },
  { quote: 'They refunded my deposit the same afternoon and sent the inspection photos. That alone earned my loyalty.', name: 'Tunde B.', role: 'Lagos, weekly hire' },
  { quote: 'We move embassy guests every week. The chauffeurs are discreet and the monthly invoice is clean.', name: 'Ingrid H.', role: 'Abuja, corporate account' },
  { quote: 'Five matching SUVs for our wedding, coordinator on the day, zero drama. Our guests still talk about it.', name: 'Ebiere & Victor', role: 'Port Harcourt, wedding convoy' },
] as const

export const partnerLogos = {
  payments: ['Paystack', 'Flutterwave', 'Moniepoint', 'Opay', 'Interswitch'],
  corporate: ['Lekki Capital', 'Harbour Point', 'Gold Ribbon', 'Deltaline', 'Nordic Mission'],
  insurance: ['AXA Mansard', 'Leadway', 'AIICO', 'Cornerstone', 'Custodian'],
}

export const faqs = [
  { q: 'What do I need to rent a self-drive car?', a: `A valid Nigerian or international driver’s licence, your NIN (or passport for visitors), a live selfie during booking, and a refundable deposit. Drivers must be ${23}+ with at least 2 years’ driving experience.` },
  { q: 'How does the deposit work?', a: 'The deposit is held when you pay and refunded within 24 hours of a clean return. If there is damage, missing fuel, a late return or a traffic fine, we deduct it and send you the before-and-after photos and the calculation.' },
  { q: 'Can I book on WhatsApp?', a: `Yes. Message ${brand.contact.phoneDisplay} any time. Our concierge can check availability, quote, book, send a payment link, extend your rental and get you help on the road.` },
  { q: 'Do you do airport pickups?', a: 'Yes — Murtala Muhammed (LOS and MMA2), Nnamdi Azikiwe (ABV) and Port Harcourt (PHC). Add your flight number and we track it, so we wait if you land late.' },
  { q: 'Can I take the car to another state?', a: 'Yes, with an interstate permit added to your booking. SUVs are recommended for long trips, and a security escort can be added for some routes.' },
  { q: 'What happens if the car breaks down?', a: 'Message us on WhatsApp or call. We can see the car on GPS, send recovery and bring a replacement car. You won’t pay for mechanical failures that are not caused by misuse.' },
  { q: 'Is my NIN and selfie stored?', a: 'Verification is done by a licensed identity provider. We keep only the result (verified or not) and a reference — never your raw NIN or selfie image.' },
  { q: 'How do I cancel?', a: 'Free cancellation up to 24 hours before pick-up. Inside 24 hours, one day’s rental is kept. Deposits are always refunded in full on cancellation.' },
]

/** Sallah (Eid al-Fitr) dates are lunar; approximate table, update yearly. */
const SALLAH: Record<number, string> = { 2026: '03-20', 2027: '03-10', 2028: '02-27', 2029: '02-15', 2030: '02-05' }

export interface PeakDate {
  id: string
  name: string
  where: string
  date: Date
  note: string
  image: string
}

/** Upcoming peak dates, always computed from today so they're in the future. */
export function upcomingPeakDates(now = new Date()): PeakDate[] {
  const today = startOfDay(now)
  const y = today.getFullYear()
  const next = (build: (year: number) => Date) => {
    const d = build(y)
    return d >= today ? d : build(y + 1)
  }
  const list: PeakDate[] = [
    { id: 'festive', name: 'December festive season', where: 'All cities', date: next((yr) => new Date(yr, 11, 15)), note: 'Diaspora arrivals and owambes. Fleet sells out first.', image: images.cars.landCruiser },
    { id: 'detty', name: 'Detty December concerts', where: 'Lagos — VI & Lekki', date: next((yr) => new Date(yr, 11, 20)), note: 'Chauffeur bookings triple. Book convoys early.', image: images.cars.escalade },
    { id: 'nye', name: 'New Year’s Eve', where: 'All cities', date: next((yr) => new Date(yr, 11, 31)), note: 'Night-out chauffeurs and airport runs.', image: images.cars.sClass },
    { id: 'valentine', name: 'Valentine’s weekend', where: 'Lagos & Abuja', date: next((yr) => new Date(yr, 1, 13)), note: 'Luxury saloons and proposal cars.', image: images.cars.gleCoupe },
    { id: 'easter', name: 'Easter weekend', where: 'All cities', date: next((yr) => new Date(easterRange(yr)[0] + 'T00:00:00')), note: 'Interstate trips home. SUVs go first.', image: images.cars.prado },
    { id: 'sallah', name: 'Sallah holidays', where: 'Abuja & the North', date: next((yr) => new Date(`${yr}-${SALLAH[yr] ?? '03-20'}T00:00:00`)), note: 'Abuja–Kano and Abuja–Kaduna demand peaks.', image: images.cars.lexusLx },
    { id: 'independence', name: 'Independence Day', where: 'Abuja', date: next((yr) => new Date(yr, 9, 1)), note: 'Official and diplomatic movements.', image: images.cars.gls },
  ]
  return list.sort((a, b) => +a.date - +b.date).slice(0, 5)
}
