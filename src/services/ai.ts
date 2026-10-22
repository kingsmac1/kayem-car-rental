/**
 * AI service — WhatsApp concierge replies, damage detection and the business analyst.
 * TODO: connect real provider — send the conversation plus a compact fleet/booking
 * context to an LLM (via a Supabase Edge Function, never from the browser) with
 * tool calls for `check_availability`, `quote`, `create_booking`, `payment_link`,
 * `extend_booking`, `report_breakdown` and `handover`. Damage detection can use a
 * vision model comparing check-out and check-in photos.
 *
 * Demo: a scripted, rules-based mock that reads the real mock fleet and bookings,
 * understands loose phrasing ("I need a Prado in Abuja this weekend"), and
 * actually creates bookings so they show up in the admin dashboard.
 */
import type { City } from '@/config/brand'
import { brand } from '@/config/brand'
import { db } from '@/lib/db'
import { quote } from '@/lib/pricing'
import { addDays, fmtDay, fmtTime, naira, sleep, startOfDay } from '@/lib/utils'
import { carName } from '@/mocks/cars'
import { locations } from '@/mocks/locations'
import type { Car, ChatCard, DemoState } from '@/mocks/types'
import { bookingService, BookingConflictError } from './bookings'
import { bookability, docState, overlaps } from './fleet'
import { depositSummary, outstanding, profitPerCar, revenueBetween, revenueByDay, todayOps, topCustomers, utilisation } from '@/lib/metrics'

// ---------------------------------------------------------------------------
// Concierge

export interface ConciergeContext {
  city?: City
  carId?: string
  category?: Car['category'] | 'SUV-any'
  start?: string
  end?: string
  mode?: 'self-drive' | 'chauffeur'
  pickupId?: string
  stage: 'idle' | 'choosing' | 'quoted' | 'awaiting-payment' | 'confirmed' | 'handover' | 'breakdown'
  bookingId?: string
  bookingRef?: string
  customerName: string
  customerId: string
}

export interface BotMessage {
  text: string
  card?: ChatCard
}

export interface ConciergeReply {
  messages: BotMessage[]
  ctx: ConciergeContext
  chips: string[]
  handover?: boolean
}

const CITY_WORDS: [RegExp, City][] = [
  [/\b(lagos|lekki|ikoyi|ikeja|vi|victoria island|ajah|yaba|surulere|mma|mma2|murtala)\b/i, 'Lagos'],
  [/\b(abuja|fct|wuse|maitama|garki|asokoro|gwarinpa|kubwa|nnamdi azikiwe)\b/i, 'Abuja'],
  [/\b(port ?harcourt|ph|phc|garden city|omagwa|trans.?amadi|rumuokoro)\b/i, 'Port Harcourt'],
]

const MODEL_WORDS: [RegExp, (c: Car) => boolean][] = [
  [/\bprado\b/i, (c) => /prado/i.test(c.model)],
  [/\b(land ?cruiser|lc ?300|lc ?200|v8)\b/i, (c) => /land cruiser/i.test(c.model)],
  [/\bcamry\b/i, (c) => /camry/i.test(c.model)],
  [/\bcorolla\b/i, (c) => /corolla/i.test(c.model)],
  [/\b(lexus ?rx|rx ?350|\brx\b)/i, (c) => /RX/.test(c.model)],
  [/\b(lexus ?lx|lx ?600|\blx\b)/i, (c) => /LX/.test(c.model)],
  [/\blexus\b/i, (c) => c.make === 'Lexus'],
  [/\b(s.?class|s ?580|maybach)\b/i, (c) => /S 580/.test(c.model)],
  [/\b(e.?class|e ?300)\b/i, (c) => /E 300/.test(c.model)],
  [/\bgle\b/i, (c) => /GLE/.test(c.model)],
  [/\bgls\b/i, (c) => /GLS/.test(c.model)],
  [/\b(benz|mercedes|merc)\b/i, (c) => c.make === 'Mercedes-Benz'],
  [/\b(range ?rover|rr sport|range)\b/i, (c) => /Range Rover/.test(c.model)],
  [/\bdefender\b/i, (c) => /Defender/.test(c.model)],
  [/\b(hiace|14.?seat)/i, (c) => /Hiace/.test(c.model)],
  [/\b(coaster|30.?seat|big bus)\b/i, (c) => /Coaster/.test(c.model)],
  [/\belantra\b/i, (c) => /Elantra/.test(c.model)],
  [/\baccord\b/i, (c) => /Accord/.test(c.model)],
  [/\bescalade\b/i, (c) => /Escalade/.test(c.model)],
  [/\b(yukon|gmc)\b/i, (c) => /Yukon/.test(c.model)],
  [/\b(cx.?5|mazda)\b/i, (c) => /CX-5/.test(c.model)],
]

const CATEGORY_WORDS: [RegExp, NonNullable<ConciergeContext['category']>][] = [
  [/\b(bus|buses|van|minibus|shuttle)\b/i, 'Van'],
  [/\b(jeep|suv|4x4|4wd)\b/i, 'SUV-any'],
  [/\b(saloon|sedan|small car|cheap|budget|affordable)\b/i, 'Saloon'],
  [/\b(luxury|executive|vip|wedding|premium)\b/i, 'Luxury SUV'],
]

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

/** Pulls a date range out of loose text. Returns undefined when no date words are present. */
export function parseDates(text: string, now = new Date()): { start: Date; end: Date } | undefined {
  const t = text.toLowerCase()
  const today = startOfDay(now)
  let start: Date | undefined
  let days: number | undefined

  const nDays = t.match(/(\d+)\s*(day|days|night|nights)\b/)
  const nWeeks = t.match(/(\d+|a|one|two)\s*weeks?\b/)
  if (nDays) days = Number(nDays[1])
  else if (nWeeks) days = 7 * (/\d/.test(nWeeks[1]) ? Number(nWeeks[1]) : nWeeks[1] === 'two' ? 2 : 1)
  else if (/\b(a|one) month\b|\bmonthly\b/.test(t)) days = 30

  if (/\bthis weekend\b|\bweekend\b/.test(t)) {
    const toSat = (6 - today.getDay() + 7) % 7 || (today.getDay() === 6 ? 0 : 7)
    start = addDays(today, today.getDay() === 6 ? 0 : toSat)
    days = days ?? 2
  } else if (/\bnext week\b/.test(t)) {
    start = addDays(today, ((8 - today.getDay()) % 7) || 7)
    days = days ?? 5
  } else if (/\btomorrow\b|\btmrw\b|\btmr\b/.test(t)) start = addDays(today, 1)
  else if (/\btoday\b|\bnow\b|\basap\b|\btonight\b/.test(t)) start = today
  else {
    const wd = WEEKDAYS.findIndex((w) => new RegExp(`\\b(${w}|${w.slice(0, 3)})\\b`).test(t))
    if (wd >= 0) start = addDays(today, ((wd - today.getDay() + 7) % 7) || 7)
    const dom = t.match(/\b(\d{1,2})(st|nd|rd|th)\b/)
    if (!start && dom) {
      const d = Number(dom[1])
      const cand = new Date(today.getFullYear(), today.getMonth(), d)
      start = cand < today ? new Date(today.getFullYear(), today.getMonth() + 1, d) : cand
    }
  }
  // "from friday to sunday"
  const range = t.match(/(?:from\s+)?(\w+)\s+(?:to|till|until|-)\s+(\w+)/)
  if (range) {
    const a = WEEKDAYS.findIndex((w) => range[1].startsWith(w.slice(0, 3)))
    const b = WEEKDAYS.findIndex((w) => range[2].startsWith(w.slice(0, 3)))
    if (a >= 0 && b >= 0) {
      start = addDays(today, ((a - today.getDay() + 7) % 7) || 7)
      days = ((b - a + 7) % 7) || 7
    }
  }
  if (!start && days === undefined) return undefined
  start = start ?? addDays(today, 1)
  const s = new Date(start)
  s.setHours(10, 0, 0, 0)
  if (start.getTime() === today.getTime()) s.setHours(Math.min(20, now.getHours() + 2), 0, 0, 0)
  const e = addDays(s, days ?? 1)
  return { start: s, end: e }
}

function detect(text: string) {
  const t = text.toLowerCase()
  return {
    greeting: /^(hi|hello|hey|good (morning|afternoon|evening)|howdy|yo)\b/.test(t),
    breakdown: /\b(break ?down|broke|broken|accident|crash|flat tyre|flat tire|engine light|won'?t start|overheat|stuck|emergency|towing|police stopped)\b/.test(t),
    human: /\b(human|agent|person|manager|someone|call me|speak to|talk to|customer care|representative)\b/.test(t),
    extend: /\b(extend|extension|more days?|add(ing)? (a )?day|keep (it|the car) (longer|till|until)|longer)\b/.test(t),
    paid: /\b(i('ve| have)? paid|payment (done|made|sent)|transferred|done paying|sent the money|paid)\b/.test(t),
    book: /\b(book|reserve|hold it|go ahead|confirm|yes|yeah|yep|ok(ay)?|sure|let'?s do it|i'?ll take)\b/.test(t),
    price: /\b(how much|price|pricing|cost|rate|rates|quote|charge|fee)\b/.test(t),
    availability: /\b(available|availability|do you have|need|want|looking for|got any|any car|free)\b/.test(t),
    chauffeur: /\b(driver|chauffeur|with driver|driven)\b/.test(t),
    selfDrive: /\b(self.?drive|drive myself|no driver|without driver)\b/.test(t),
    airport: /\b(airport|landing|arriving|arrival|flight)\b/.test(t),
    thanks: /\b(thanks|thank you|thx|appreciate)\b/.test(t),
    choose: t.match(/\b(first|1st|second|2nd|third|3rd|option ?\d)\b/),
  }
}

function findCars(s: DemoState, ctx: ConciergeContext, text: string) {
  let pool = s.cars.filter((c) => bookability(c).ok)
  const city = ctx.city
  if (city) pool = pool.filter((c) => c.city === city)
  const model = MODEL_WORDS.find(([re]) => re.test(text))
  if (model) pool = pool.filter(model[1])
  else if (ctx.category) {
    pool = pool.filter((c) =>
      ctx.category === 'SUV-any' ? /SUV/.test(c.category) : ctx.category === 'Van' ? c.category === 'Van' || c.category === 'Bus' : ctx.category === 'Luxury SUV' ? /Luxury/.test(c.category) : c.category === ctx.category,
    )
  }
  const start = ctx.start ? new Date(ctx.start) : undefined
  const end = ctx.end ? new Date(ctx.end) : undefined
  const free = start && end ? pool.filter((c) => overlaps(s, c.id, start, end).length === 0) : pool.filter((c) => c.status === 'available')
  return { matchedModel: !!model, pool, free: free.sort((a, b) => a.rates.daily - b.rates.daily) }
}

function rangeText(ctx: ConciergeContext) {
  if (!ctx.start || !ctx.end) return ''
  const days = Math.max(1, Math.round((+new Date(ctx.end) - +new Date(ctx.start)) / 86_400_000))
  return `${fmtDay(ctx.start)} → ${fmtDay(ctx.end)} (${days} day${days > 1 ? 's' : ''})`
}

const DEFAULT_CHIPS = ['I need a Prado in Abuja this weekend', 'How much is a Camry in Lagos for 3 days?', 'Extend my rental by 2 days', 'My car broke down', 'Talk to a human']

export function newConciergeContext(): ConciergeContext {
  return { stage: 'idle', customerName: 'Chiamaka', customerId: 'c-1' }
}

export const aiService = {
  greeting(): ConciergeReply {
    return {
      ctx: newConciergeContext(),
      messages: [
        { text: `Hi 👋 I’m the ${brand.shortName} concierge. I can check cars, quote prices, book, extend a rental or get help on the road — 24/7.` },
        { text: 'Tell me what you need, e.g. “Prado in Abuja this weekend” or “airport pickup Lagos tomorrow”.' },
      ],
      chips: DEFAULT_CHIPS,
    }
  },

  async conciergeReply(text: string, prev: ConciergeContext): Promise<ConciergeReply> {
    await sleep(500)
    const s = db.get()
    const ctx: ConciergeContext = { ...prev }
    const d = detect(text)

    // Update context from anything we can parse.
    const city = CITY_WORDS.find(([re]) => re.test(text))?.[1]
    const cat = CATEGORY_WORDS.find(([re]) => re.test(text))?.[1]
    const mentionsModel = MODEL_WORDS.some(([re]) => re.test(text))
    const chosen = ctx.carId ? s.cars.find((c) => c.id === ctx.carId) : undefined
    if (chosen && (mentionsModel || cat || (city && city !== chosen.city))) {
      // A new request: forget the previous pick and start a fresh search.
      ctx.carId = undefined
      if (ctx.stage === 'quoted' || ctx.stage === 'choosing') ctx.stage = 'idle'
    }
    if (city) ctx.city = city
    if (cat) ctx.category = cat
    if (mentionsModel) ctx.category = undefined
    const dates = parseDates(text)
    if (dates) {
      ctx.start = dates.start.toISOString()
      ctx.end = dates.end.toISOString()
    }
    if (d.chauffeur) ctx.mode = 'chauffeur'
    if (d.selfDrive) ctx.mode = 'self-drive'
    if (d.airport && ctx.city) ctx.pickupId = locations.find((l) => l.city === ctx.city && l.kind === 'airport')?.id

    // 1. Emergencies first.
    if (d.breakdown) {
      ctx.stage = 'breakdown'
      const active = s.bookings.filter((b) => b.customerId === ctx.customerId && b.status === 'active').sort((a, b) => +new Date(a.end) - +new Date(b.end))[0]
      const car = active ? s.cars.find((c) => c.id === active.carId) : undefined
      return {
        ctx,
        messages: [
          { text: `I’m sorry — first, are you safe? If anyone is hurt call 112 now.` },
          { text: car ? `I can see your ${carName(car)} (${car.plate}) on GPS. Turn on hazard lights and stay with the car if it’s safe. Our nearest recovery team has been alerted and a replacement car is on standby.` : 'Share your location (📎 → Location) and I’ll dispatch our nearest recovery team.' },
          { text: 'A duty manager will call you within 5 minutes. Reference: RSA-' + String(Date.now()).slice(-5) },
        ],
        chips: ['Send a replacement car', 'Talk to a human', 'It’s fixed now, thanks'],
      }
    }

    if (d.human) {
      ctx.stage = 'handover'
      return {
        ctx,
        handover: true,
        messages: [
          { text: 'Sure — connecting you to a team member now. They can see this whole chat, so no need to repeat yourself.', card: { kind: 'handover' } },
        ],
        chips: ['Thanks'],
      }
    }

    if (/replacement/i.test(text)) {
      return { ctx, messages: [{ text: 'Done. A replacement car is being prepared and a driver will bring it to your location. ETA about 45 minutes in current traffic — I’ll message you when they leave.' }], chips: ['Thanks', 'Talk to a human'] }
    }

    // 2. Extend an active rental.
    if (d.extend) {
      const active = s.bookings.filter((b) => b.customerId === ctx.customerId && b.status === 'active').sort((a, b) => +new Date(a.end) - +new Date(b.end))[0]
      if (!active) return { ctx, messages: [{ text: `I can’t find an active rental on this number. Send your booking reference (e.g. ${brand.refPrefix}-4123) and I’ll check.` }], chips: DEFAULT_CHIPS }
      const car = s.cars.find((c) => c.id === active.carId)!
      const n = Number(text.match(/(\d+)\s*(more )?days?/)?.[1] ?? 1)
      const clash = overlaps(s, car.id, new Date(active.end), addDays(active.end, n), active.id)
      if (clash.length) {
        const alt = s.cars.find((c) => c.city === car.city && c.category === car.category && c.id !== car.id && overlaps(s, c.id, new Date(active.end), addDays(active.end, n)).length === 0 && bookability(c).ok)
        return {
          ctx,
          messages: [{ text: `The ${carName(car)} is booked by another customer from ${fmtDay(clash[0].start)}, so I can’t extend it.${alt ? ` I can swap you into a ${carName(alt)} at ${naira(alt.rates.daily)}/day for the extra ${n} day${n > 1 ? 's' : ''} — want that?` : ''}` }],
          chips: alt ? ['Yes, swap the car', 'Talk to a human'] : ['Talk to a human'],
        }
      }
      try {
        const { newEnd, extra } = await bookingService.extend(active.id, n, car.rates.daily)
        return {
          ctx,
          messages: [
            { text: `Done ✅ Your ${carName(car)} is now yours until ${fmtDay(newEnd)}. ${n} extra day${n > 1 ? 's' : ''} = ${naira(extra)}.` },
            { text: 'Pay with this secure link:', card: { kind: 'payment', ref: active.ref, amount: extra } },
          ],
          chips: ['I have paid', 'Thanks'],
        }
      } catch (e) {
        return { ctx, messages: [{ text: e instanceof Error ? e.message : 'I couldn’t extend that booking.' }], chips: ['Talk to a human'] }
      }
    }

    // 3. Payment confirmation.
    if (d.paid && ctx.stage === 'awaiting-payment' && ctx.bookingId) {
      const b = s.bookings.find((x) => x.id === ctx.bookingId)
      if (b) {
        await bookingService.update(b.id, { status: 'confirmed', paid: b.total, depositStatus: 'held' })
        ctx.stage = 'confirmed'
        const car = s.cars.find((c) => c.id === b.carId)!
        return {
          ctx,
          messages: [
            { text: 'Payment received — thank you! 🎉' },
            { text: 'You’re booked:', card: { kind: 'confirmed', ref: b.ref, carId: car.id, start: b.start, pickup: b.pickup } },
            { text: 'Before pickup, bring your driver’s licence. If you haven’t verified yet, I’ll send a 2-minute verification link. I’ll remind you 2 hours before pickup.' },
          ],
          chips: ['Extend my rental by 2 days', 'Talk to a human', 'Thanks'],
        }
      }
    }
    if (d.paid) {
      return { ctx, messages: [{ text: 'Thanks! I’ve noted that — our finance desk will match the payment in a few minutes and I’ll confirm here.' }], chips: DEFAULT_CHIPS }
    }

    // 4. Choosing / booking.
    if (ctx.stage === 'choosing' && (d.choose || d.book || MODEL_WORDS.some(([re]) => re.test(text)))) {
      const { free } = findCars(s, ctx, text)
      const idx = d.choose ? Math.max(0, Number((d.choose[0].match(/\d/) ?? ['1'])[0]) - 1 || ['first', 'second', 'third'].findIndex((w) => d.choose![0].includes(w.slice(0, 3)))) : 0
      const pick = MODEL_WORDS.some(([re]) => re.test(text)) ? free[0] : free[Math.max(0, idx)]
      if (pick) ctx.carId = pick.id
    }

    if (ctx.stage === 'quoted' && d.book && ctx.carId && ctx.start && ctx.end) {
      const car = s.cars.find((c) => c.id === ctx.carId)!
      const q = quote({ car, start: new Date(ctx.start), end: new Date(ctx.end), mode: ctx.mode ?? (car.modes.includes('self-drive') ? 'self-drive' : 'chauffeur'), extras: [], rules: s.pricing })
      try {
        const pickup = ctx.pickupId ?? locations.find((l) => l.city === car.city && l.kind === 'office')!.id
        const b = await bookingService.create({
          carId: car.id, customerId: ctx.customerId, start: ctx.start, end: ctx.end, pickup, dropoff: pickup,
          mode: ctx.mode ?? (car.modes.includes('self-drive') ? 'self-drive' : 'chauffeur'), extras: [], status: 'pending',
          total: q.total, paid: 0, deposit: q.deposit, channel: 'whatsapp',
        })
        ctx.stage = 'awaiting-payment'
        ctx.bookingId = b.id
        ctx.bookingRef = b.ref
        return {
          ctx,
          messages: [
            { text: `Great — I’ve reserved the ${carName(car)} for you for 30 minutes (ref ${b.ref}).` },
            { text: `Pay ${naira(q.total)} rental + ${naira(q.deposit)} refundable deposit here:`, card: { kind: 'payment', ref: b.ref, amount: q.dueNow } },
          ],
          chips: ['I have paid', 'Talk to a human'],
        }
      } catch (e) {
        if (e instanceof BookingConflictError) {
          ctx.stage = 'choosing'
          return { ctx, messages: [{ text: 'Someone just booked that car for those dates 😕 Here’s what’s still free:' }, ...availabilityMessages(s, ctx, text).messages], chips: ['Book the first one', 'Talk to a human'] }
        }
        throw e
      }
    }

    // 5. A specific car picked → quote it (needs dates).
    if (ctx.carId && (ctx.stage === 'choosing' || d.price) && ctx.start && ctx.end) {
      const car = s.cars.find((c) => c.id === ctx.carId)!
      const mode = ctx.mode ?? (car.modes.includes('self-drive') ? 'self-drive' : 'chauffeur')
      const q = quote({ car, start: new Date(ctx.start), end: new Date(ctx.end), mode, extras: [], rules: s.pricing })
      ctx.stage = 'quoted'
      return {
        ctx,
        messages: [
          { text: `${carName(car)} · ${car.city}\n${rangeText(ctx)} · ${mode === 'chauffeur' ? 'with chauffeur' : 'self-drive'}` },
          { text: 'Here’s your quote:', card: { kind: 'quote', carId: car.id, days: q.days, total: q.total, deposit: q.deposit } },
          { text: 'Shall I book it? You’ll get a secure payment link.' },
        ],
        chips: ['Yes, book it', mode === 'chauffeur' ? 'Make it self-drive' : 'Add a chauffeur', 'Talk to a human'],
      }
    }
    if (/add a chauffeur|make it self.?drive/i.test(text) && ctx.carId && ctx.start && ctx.end) {
      ctx.stage = 'choosing'
      return this.conciergeReply('quote it', ctx)
    }

    // 6. Availability / price questions.
    const asksForCar = d.availability || d.price || MODEL_WORDS.some(([re]) => re.test(text)) || !!cat || !!dates || !!city
    if (asksForCar) {
      if (!ctx.city) {
        return { ctx, messages: [{ text: 'Happy to help! Which city — Lagos, Abuja or Port Harcourt?' }], chips: ['Lagos', 'Abuja', 'Port Harcourt'] }
      }
      if (!ctx.start) {
        // Price question without dates → show rates, then ask for dates.
        const { free, pool } = findCars(s, ctx, text)
        const list = (free.length ? free : pool).slice(0, 3)
        if (!list.length) return { ctx, messages: [{ text: `I don’t have that in ${ctx.city} right now. Want me to check another city or a similar car?` }], chips: ['Show me SUVs', 'Show me saloons', 'Talk to a human'] }
        ctx.stage = 'choosing'
        return {
          ctx,
          messages: [
            { text: `In ${ctx.city}, here’s what I have:` + list.map((c) => `\n• ${carName(c)} — ${naira(c.rates.daily)}/day`).join('') },
            { text: 'When do you need it? e.g. “tomorrow for 3 days” or “this weekend”.', card: { kind: 'cars', carIds: list.map((c) => c.id) } },
          ],
          chips: ['Tomorrow for 3 days', 'This weekend', 'Next week'],
        }
      }
      return availabilityMessages(s, ctx, text)
    }

    if (d.thanks) return { ctx, messages: [{ text: `You’re welcome! Safe trip 🚗 — I’m here 24/7 if you need anything.` }], chips: DEFAULT_CHIPS }
    if (d.greeting) return { ...this.greeting(), ctx: { ...ctx, stage: 'idle' } }

    return {
      ctx,
      messages: [{ text: 'I can check availability, quote prices, book, extend a rental or help with a breakdown. What would you like to do?' }],
      chips: DEFAULT_CHIPS,
    }
  },

  // -------------------------------------------------------------------------
  // Damage detection (inspections)

  /** Simulated vision comparison of check-out vs check-in photos for one angle. */
  async detectDamage(angle: string, seed: number): Promise<{ x: number; y: number; label: string; severity: 'minor' | 'moderate' | 'major'; cost: number; confidence: number }[]> {
    await sleep(1600)
    const catalogue: Record<string, { x: number; y: number; label: string; severity: 'minor' | 'moderate' | 'major'; cost: number }[]> = {
      front: [{ x: 0.32, y: 0.62, label: 'Stone chip on bonnet', severity: 'minor', cost: 15000 }],
      rear: [{ x: 0.7, y: 0.66, label: 'Scuff on rear bumper', severity: 'moderate', cost: 45000 }],
      left: [{ x: 0.45, y: 0.55, label: 'Door ding, front-left', severity: 'minor', cost: 25000 }],
      right: [{ x: 0.58, y: 0.6, label: 'Scratch along rear door (18 cm)', severity: 'moderate', cost: 60000 }, { x: 0.82, y: 0.72, label: 'Kerbed alloy wheel', severity: 'minor', cost: 35000 }],
      interior: [{ x: 0.5, y: 0.7, label: 'Stain on rear seat', severity: 'minor', cost: 20000 }],
      dashboard: [],
    }
    const hits = catalogue[angle] ?? []
    // Deterministic per inspection so re-running gives the same answer.
    return hits.filter((_, i) => (seed + i + angle.length) % 3 !== 0).map((h) => ({ ...h, confidence: 0.78 + ((seed + h.label.length) % 20) / 100 }))
  },
}

function availabilityMessages(s: DemoState, ctx: ConciergeContext, text: string): ConciergeReply {
  const { free, matchedModel, pool } = findCars(s, ctx, text)
  if (!free.length) {
    const alt = s.cars.filter((c) => c.city === ctx.city && bookability(c).ok && ctx.start && ctx.end && overlaps(s, c.id, new Date(ctx.start), new Date(ctx.end)).length === 0).slice(0, 3)
    ctx.stage = 'choosing'
    return {
      ctx,
      messages: [
        { text: `${matchedModel && pool[0] ? `The ${pool[0].model}` : 'That car'} is fully booked in ${ctx.city} for ${rangeText(ctx)} 😕` },
        ...(alt.length ? [{ text: 'These are free on the same dates:', card: { kind: 'cars' as const, carIds: alt.map((c) => c.id) } }] : []),
      ],
      chips: alt.length ? ['Book the first one', 'Try other dates', 'Talk to a human'] : ['Try other dates', 'Talk to a human'],
    }
  }
  ctx.stage = 'choosing'
  if (free.length === 1 || matchedModel) {
    ctx.carId = free[0].id
    const car = free[0]
    const mode = ctx.mode ?? (car.modes.includes('self-drive') ? 'self-drive' : 'chauffeur')
    const q = quote({ car, start: new Date(ctx.start!), end: new Date(ctx.end!), mode, extras: [], rules: s.pricing })
    ctx.stage = 'quoted'
    return {
      ctx,
      messages: [
        { text: `Yes ✅ The ${carName(car)} (${car.year}) is free in ${car.city}, ${rangeText(ctx)}.` },
        { text: `${naira(car.rates.daily)}/day · ${mode === 'chauffeur' ? 'with chauffeur' : 'self-drive'}. Your quote:`, card: { kind: 'quote', carId: car.id, days: q.days, total: q.total, deposit: q.deposit } },
        { text: 'Want me to book it?' },
      ],
      chips: ['Yes, book it', mode === 'chauffeur' ? 'Make it self-drive' : 'Add a chauffeur', 'Talk to a human'],
    }
  }
  return {
    ctx,
    messages: [{ text: `Good news — ${free.length} cars are free in ${ctx.city}, ${rangeText(ctx)}. Top picks:`, card: { kind: 'cars', carIds: free.slice(0, 3).map((c) => c.id) } }, { text: 'Which one should I quote?' }],
    chips: ['Book the first one', 'The second one', 'Talk to a human'],
  }
}

// ---------------------------------------------------------------------------
// AI Business Analyst — answers are computed from the live demo data.


export interface AnalystAnswer {
  text: string
  table?: { columns: string[]; rows: (string | number)[][] }
  chart?: { kind: 'bar' | 'trend'; data: Record<string, string | number>[]; x: string; y: string; money?: boolean; unit?: string }
}

export const ANALYST_SUGGESTIONS = [
  'Which car made the least money last month?',
  'Who are my top 10 customers?',
  'How many bookings are due back today?',
  'What was revenue this month?',
  'Which cars are always idle?',
  'Which city makes the most money?',
  'How much deposit money am I holding?',
  'Who owes me money?',
  'Which chauffeur has the best rating?',
  'Which documents expire soon?',
  'How many bookings came from WhatsApp?',
  'Any overdue rentals?',
]

function period(q: string, now: Date) {
  const today = startOfDay(now)
  if (/last month/.test(q)) {
    const from = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const to = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59)
    return { from, to, label: from.toLocaleDateString('en-GB', { month: 'long' }) }
  }
  if (/this month|month to date|mtd/.test(q)) return { from: new Date(today.getFullYear(), today.getMonth(), 1), to: now, label: 'this month' }
  if (/this week|week/.test(q)) return { from: addDays(today, -((today.getDay() + 6) % 7)), to: now, label: 'this week' }
  if (/today/.test(q)) return { from: today, to: now, label: 'today' }
  if (/year|ytd/.test(q)) return { from: new Date(today.getFullYear(), 0, 1), to: now, label: 'this year' }
  return { from: addDays(today, -30), to: now, label: 'the last 30 days' }
}

export async function analystAnswer(question: string, s: DemoState = db.get(), now = new Date()): Promise<AnalystAnswer> {
  await sleep(700)
  const q = question.toLowerCase()
  const p = period(q, now)
  const short = (n: number) => naira(n)

  if (/(least|lowest|worst|most|highest|best|top).*(car|vehicle)|(car|vehicle).*(least|most|made|earn|profit)/.test(q) && !/customer|chauffeur|driver|city/.test(q)) {
    const rows = profitPerCar(s, p.from, p.to)
    const byRevenue = [...rows].sort((a, b) => a.revenue - b.revenue)
    const worst = /least|lowest|worst/.test(q)
    const pick = worst ? byRevenue[0] : byRevenue[byRevenue.length - 1]
    const list = worst ? byRevenue.slice(0, 5) : [...byRevenue].reverse().slice(0, 5)
    return {
      text: `${worst ? 'Lowest' : 'Highest'} earner in ${p.label}: **${carName(pick.car)}** (${pick.car.city}) with ${short(pick.revenue)} revenue, ${short(pick.maintenance)} maintenance and ${Math.round(pick.utilisation * 100)}% utilisation.${worst && pick.utilisation < 0.25 ? ' It sat idle most of the period — consider a price cut or moving it to a busier city.' : ''}`,
      table: { columns: ['Car', 'City', 'Revenue', 'Maintenance', 'Profit', 'Utilisation'], rows: list.map((r) => [carName(r.car), r.car.city, short(r.revenue), short(r.maintenance), short(r.profit), `${Math.round(r.utilisation * 100)}%`]) },
      chart: { kind: 'bar', data: list.map((r) => ({ car: r.car.model.split(' ').slice(0, 2).join(' '), revenue: r.revenue })), x: 'car', y: 'revenue', money: true },
    }
  }

  if (/top|best|biggest|loyal/.test(q) && /customer|client/.test(q)) {
    const n = Number(q.match(/\d+/)?.[0] ?? 10)
    const top = topCustomers(s, n)
    return {
      text: `Your top ${top.length} customers by lifetime value. ${top[0]?.customer.name} leads with ${short(top[0]?.ltv ?? 0)} over ${top[0]?.trips} trips.`,
      table: { columns: ['#', 'Customer', 'City', 'Trips', 'Lifetime value'], rows: top.map((t, i) => [i + 1, t.customer.name, t.customer.city, t.trips, short(t.ltv)]) },
    }
  }

  if (/due back|returning|returns? today|coming back/.test(q)) {
    const ops = todayOps(s, now)
    const list = [...ops.dueBack, ...ops.overdue]
    return {
      text: `${ops.dueBack.length} booking${ops.dueBack.length === 1 ? ' is' : 's are'} due back today${ops.overdue.length ? `, plus ${ops.overdue.length} already overdue` : ''}.`,
      table: list.length ? { columns: ['Ref', 'Car', 'Customer', 'Due', 'Status'], rows: list.map((b) => [b.ref, carName(s.cars.find((c) => c.id === b.carId)!), s.customers.find((c) => c.id === b.customerId)?.name ?? '', `${fmtDay(b.end)} ${fmtTime(b.end)}`, new Date(b.end) < now ? 'Overdue' : 'Due today']) } : undefined,
    }
  }

  if (/overdue|late/.test(q)) {
    const od = todayOps(s, now).overdue
    return {
      text: od.length ? `${od.length} rental${od.length > 1 ? 's are' : ' is'} overdue right now.` : 'Nothing is overdue right now.',
      table: od.length ? { columns: ['Ref', 'Car', 'Customer', 'Was due', 'Phone'], rows: od.map((b) => { const c = s.customers.find((x) => x.id === b.customerId); return [b.ref, carName(s.cars.find((x) => x.id === b.carId)!), c?.name ?? '', `${fmtDay(b.end)} ${fmtTime(b.end)}`, c?.phone ?? ''] }) } : undefined,
    }
  }

  if (/revenue|income|sales|made|earn/.test(q) && !/city|channel/.test(q)) {
    const total = revenueBetween(s, p.from, p.to)
    const prevFrom = new Date(+p.from - (+p.to - +p.from))
    const prev = revenueBetween(s, prevFrom, p.from)
    const change = prev ? Math.round(((total - prev) / prev) * 100) : 0
    const days = revenueByDay(s, p.from, p.to)
    return {
      text: `Revenue ${p.label}: **${short(total)}**${prev ? ` — ${change >= 0 ? 'up' : 'down'} ${Math.abs(change)}% on the period before (${short(prev)})` : ''}.`,
      chart: { kind: 'trend', data: days.map((d) => ({ day: fmtDay(d.date).replace(/^\w+ /, ''), revenue: d.revenue })), x: 'day', y: 'revenue', money: true },
    }
  }

  if (/idle|utili[sz]ation|sold out|busy|demand/.test(q)) {
    const rows = profitPerCar(s, addDays(now, -30), now).sort((a, b) => a.utilisation - b.utilisation)
    const idle = rows.filter((r) => r.utilisation < 0.25)
    const hot = rows.filter((r) => r.utilisation > 0.75)
    return {
      text: `Fleet utilisation over 30 days is ${Math.round(utilisation(s, addDays(now, -30), now) * 100)}%. ${idle.length} car${idle.length === 1 ? ' is' : 's are'} mostly idle (<25%)${hot.length ? ` and ${hot.length} are nearly always booked (>75%) — those can take a price rise` : ''}.`,
      table: { columns: ['Car', 'City', 'Utilisation', 'Daily rate'], rows: [...idle, ...hot].map((r) => [carName(r.car), r.car.city, `${Math.round(r.utilisation * 100)}%`, short(r.car.rates.daily)]) },
      chart: { kind: 'bar', data: rows.slice(0, 8).map((r) => ({ car: r.car.model.split(' ').slice(0, 2).join(' '), utilisation: Math.round(r.utilisation * 100) })), x: 'car', y: 'utilisation', money: false, unit: '%' },
    }
  }

  if (/city|cities|location/.test(q)) {
    const rows = (['Lagos', 'Abuja', 'Port Harcourt'] as const).map((city) => {
      const ids = new Set(s.cars.filter((c) => c.city === city).map((c) => c.id))
      const rev = s.bookings.filter((b) => ids.has(b.carId) && b.status !== 'cancelled' && new Date(b.end) >= p.from && new Date(b.start) <= p.to).reduce((a, b) => a + b.total, 0)
      return { city, rev, cars: ids.size }
    }).sort((a, b) => b.rev - a.rev)
    return {
      text: `${rows[0].city} brings in the most: ${short(rows[0].rev)} in ${p.label} from ${rows[0].cars} cars (${short(Math.round(rows[0].rev / rows[0].cars))} per car).`,
      table: { columns: ['City', 'Cars', 'Revenue', 'Per car'], rows: rows.map((r) => [r.city, r.cars, short(r.rev), short(Math.round(r.rev / r.cars))]) },
      chart: { kind: 'bar', data: rows.map((r) => ({ city: r.city, revenue: r.rev })), x: 'city', y: 'revenue', money: true },
    }
  }

  if (/deposit/.test(q)) {
    const d = depositSummary(s)
    return { text: `You’re holding ${short(d.held)} in deposits right now. Lifetime: ${short(d.refunded)} refunded in full and ${short(d.deducted)} deducted for damage, fuel, late returns and fines.`, table: { columns: ['Held now', 'Refunded', 'Deducted'], rows: [[short(d.held), short(d.refunded), short(d.deducted)]] } }
  }

  if (/owe|outstanding|unpaid|debt|balance/.test(q)) {
    const o = outstanding(s).filter((x) => x.booking.status !== 'pending')
    const sum = o.reduce((a, x) => a + x.due, 0)
    return { text: `${o.length} booking${o.length === 1 ? ' has' : 's have'} unpaid balances totalling ${short(sum)}.`, table: { columns: ['Ref', 'Customer', 'Status', 'Owed'], rows: o.map((x) => [x.booking.ref, s.customers.find((c) => c.id === x.booking.customerId)?.name ?? '', x.booking.status, short(x.due)]) } }
  }

  if (/chauffeur|driver/.test(q)) {
    const list = [...s.chauffeurs].sort((a, b) => b.rating - a.rating || b.trips - a.trips)
    return { text: `${list[0].name} (${list[0].city}) has the best rating at ${list[0].rating.toFixed(1)}★ over ${list[0].trips} trips.`, table: { columns: ['Chauffeur', 'City', 'Rating', 'Trips', 'Available'], rows: list.map((d) => [d.name, d.city, d.rating.toFixed(1), d.trips, d.available ? 'Yes' : 'No']) } }
  }

  if (/document|licen[cs]e|insurance|expir/.test(q)) {
    const rows = s.cars.flatMap((c) => c.documents.filter((d) => docState(d.expires) !== 'ok').map((d) => [carName(c), c.plate, d.type, fmtDay(d.expires), docState(d.expires) === 'expired' ? 'Expired' : 'Expiring']))
    return { text: rows.length ? `${rows.length} document${rows.length > 1 ? 's need' : ' needs'} attention. Expired documents block the car from booking until renewed.` : 'All car documents are valid for at least 30 days.', table: rows.length ? { columns: ['Car', 'Plate', 'Document', 'Expiry', 'State'], rows } : undefined }
  }

  if (/whatsapp|channel|website|walk.?in|source/.test(q)) {
    const by: Record<string, number> = {}
    for (const b of s.bookings.filter((x) => x.status !== 'cancelled' && new Date(x.createdAt) >= p.from)) by[b.channel] = (by[b.channel] ?? 0) + 1
    const total = Object.values(by).reduce((a, n) => a + n, 0)
    const rows = Object.entries(by).sort((a, b) => b[1] - a[1])
    return {
      text: `${by.whatsapp ?? 0} of ${total} bookings (${Math.round(((by.whatsapp ?? 0) / Math.max(1, total)) * 100)}%) in ${p.label} came through WhatsApp.`,
      table: { columns: ['Channel', 'Bookings', 'Share'], rows: rows.map(([k, n]) => [k, n, `${Math.round((n / total) * 100)}%`]) },
      chart: { kind: 'bar', data: rows.map(([k, n]) => ({ channel: k, bookings: n })), x: 'channel', y: 'bookings', money: false },
    }
  }

  return { text: `I can answer questions about revenue, cars, customers, utilisation, deposits, unpaid balances, chauffeurs, documents and booking channels. Try: “${ANALYST_SUGGESTIONS[0]}”` }
}

/** The owner's daily WhatsApp summary, computed from today's numbers. */
export function dailySummary(s: DemoState = db.get(), now = new Date()) {
  const today = startOfDay(now)
  const ops = todayOps(s, now)
  const rev = revenueBetween(s, today, now)
  const yRev = revenueBetween(s, addDays(today, -1), addDays(today, -1))
  const owed = outstanding(s).filter((o) => o.booking.status !== 'pending').reduce((a, o) => a + o.due, 0)
  const util = Math.round(utilisation(s, addDays(today, -7), now) * 100)
  const docs = s.cars.flatMap((c) => c.documents).filter((d) => docState(d.expires) !== 'ok').length
  return [
    `☀️ ${brand.shortName} daily summary — ${fmtDay(now)}`,
    ``,
    `💰 Revenue today: ${naira(rev)} (yesterday ${naira(yRev)})`,
    `🚗 Cars out: ${ops.carsOut.length} of ${s.cars.length} · 7-day utilisation ${util}%`,
    `📥 Pick-ups today: ${ops.pickupsToday.length} · Returns due: ${ops.dueBack.length}`,
    ops.overdue.length ? `⚠️ Overdue: ${ops.overdue.map((b) => b.ref).join(', ')}` : `✅ Nothing overdue`,
    `🧾 Unpaid balances: ${naira(owed)}`,
    docs ? `📄 ${docs} car document${docs > 1 ? 's' : ''} need renewing` : `📄 All documents valid`,
    `💬 WhatsApp chats waiting for a human: ${s.conversations.filter((c) => c.status === 'needs-human').length}`,
    ``,
    `Reply “details” for the full report.`,
  ].join('\n')
}
