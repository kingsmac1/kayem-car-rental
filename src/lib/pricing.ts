import type { Car, DriveMode, PricingRules } from '@/mocks/types'
import { DAY, isoDate, startOfDay } from './utils'

export const EXTRAS = [
  { id: 'Child seat', price: 10000, per: 'day' as const, note: 'ISOFIX, ages 1–4' },
  { id: 'Extra driver', price: 15000, per: 'day' as const, note: 'Also needs verification' },
  { id: 'Interstate permit', price: 35000, per: 'trip' as const, note: 'Required to leave the state' },
  { id: 'Security escort', price: 60000, per: 'day' as const, note: 'Licensed escort vehicle' },
]
export const CHAUFFEUR_DAY = 25000

export interface QuoteInput {
  car: Car
  start: Date
  end: Date
  mode: DriveMode
  extras: string[]
  promo?: string
  corporate?: boolean
  rules: PricingRules
}

export interface QuoteLine {
  label: string
  amount: number
}

export interface Quote {
  days: number
  hours: number
  lines: QuoteLine[]
  subtotal: number
  total: number
  deposit: number
  dueNow: number
  promoValid: boolean
}

/** Rental price with season, weekend, long-stay, same-day, corporate and promo rules applied. */
export function quote({ car, start, end, mode, extras, promo, corporate, rules }: QuoteInput): Quote {
  const ms = Math.max(end.getTime() - start.getTime(), 3600_000)
  const hours = Math.ceil(ms / 3600_000)
  // Up to 6 hours is charged hourly; then per started day (with 59 min grace).
  const days = hours <= 6 ? 0 : Math.max(1, Math.ceil((hours - 1) / 24))
  const lines: QuoteLine[] = []

  let base: number
  if (days === 0) {
    base = car.rates.hourly * hours
    lines.push({ label: `${hours} hr × ${fmt(car.rates.hourly)}`, amount: base })
  } else if (days >= 28) {
    const months = days / 30
    base = Math.round(car.rates.monthly * months)
    lines.push({ label: `${days} days at monthly rate`, amount: base })
  } else if (days >= 7) {
    base = Math.round((car.rates.weekly / 7) * days)
    lines.push({ label: `${days} days at weekly rate`, amount: base })
  } else {
    base = car.rates.daily * days
    lines.push({ label: `${days} day${days > 1 ? 's' : ''} × ${fmt(car.rates.daily)}`, amount: base })
  }

  const billDays = Math.max(1, days)
  // Season uplift: share of rental days that fall inside an active season.
  for (const s of rules.seasons.filter((x) => x.active)) {
    const from = startOfDay(new Date(s.from)).getTime()
    const to = startOfDay(new Date(s.to)).getTime() + DAY - 1
    let inSeason = 0
    for (let d = 0; d < billDays; d++) {
      const t = startOfDay(start).getTime() + d * DAY
      if (t >= from && t <= to) inSeason++
    }
    if (inSeason) lines.push({ label: `${s.name} (+${Math.round(s.uplift * 100)}%)`, amount: Math.round((base / billDays) * inSeason * s.uplift) })
  }
  // Weekend uplift on Sat/Sun days (only for short daily hires).
  if (days > 0 && days < 7) {
    let weekend = 0
    for (let d = 0; d < days; d++) {
      const wd = new Date(startOfDay(start).getTime() + d * DAY).getDay()
      if (wd === 0 || wd === 6) weekend++
    }
    if (weekend) lines.push({ label: `Weekend days (+${Math.round(rules.weekendUplift * 100)}%)`, amount: Math.round(car.rates.daily * weekend * rules.weekendUplift) })
  }
  if (isoDate(start) === isoDate(new Date())) {
    lines.push({ label: `Same-day booking (+${Math.round(rules.sameDayPremium * 100)}%)`, amount: Math.round(base * rules.sameDayPremium) })
  }
  const longStay = [...rules.longStay].sort((a, b) => b.minDays - a.minDays).find((l) => days >= l.minDays)
  if (longStay) lines.push({ label: `Long-stay discount (−${Math.round(longStay.discount * 100)}%)`, amount: -Math.round(base * longStay.discount) })

  if (mode === 'chauffeur') lines.push({ label: `Chauffeur × ${billDays} day${billDays > 1 ? 's' : ''}`, amount: CHAUFFEUR_DAY * billDays })
  for (const id of extras) {
    const e = EXTRAS.find((x) => x.id === id)
    if (e) lines.push({ label: e.per === 'day' ? `${e.id} × ${billDays}` : e.id, amount: e.per === 'day' ? e.price * billDays : e.price })
  }

  let subtotal = lines.reduce((s, l) => s + l.amount, 0)
  if (corporate) {
    const off = Math.round(subtotal * rules.corporateDiscount)
    lines.push({ label: `Corporate rate (−${Math.round(rules.corporateDiscount * 100)}%)`, amount: -off })
    subtotal -= off
  }
  const p = promo ? rules.promos.find((x) => x.code.toUpperCase() === promo.trim().toUpperCase() && x.active && x.uses < x.limit && new Date(x.expires) > new Date()) : undefined
  if (p) {
    const off = Math.round(subtotal * p.discount)
    lines.push({ label: `Promo ${p.code} (−${Math.round(p.discount * 100)}%)`, amount: -off })
    subtotal -= off
  }
  const total = Math.round(subtotal / 500) * 500
  const deposit = mode === 'chauffeur' ? Math.round(car.deposit * 0.5 / 50000) * 50000 : car.deposit
  return { days: billDays, hours, lines, subtotal, total, deposit, dueNow: total + deposit, promoValid: !!p }
}

const fmt = (n: number) => `₦${n.toLocaleString('en-NG')}`
