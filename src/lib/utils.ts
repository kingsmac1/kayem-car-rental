import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { brand } from '@/config/brand'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const nf = new Intl.NumberFormat(brand.currency.locale, { maximumFractionDigits: 0 })

/** ₦85,000 */
export function naira(amount: number) {
  const sign = amount < 0 ? '-' : ''
  return `${sign}${brand.currency.symbol}${nf.format(Math.abs(Math.round(amount)))}`
}
/** ₦1.2m / ₦850k for chart axes and tight tiles. */
export function nairaShort(amount: number) {
  const a = Math.abs(amount)
  if (a >= 1_000_000) return `${brand.currency.symbol}${(amount / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 1)}m`
  if (a >= 1_000) return `${brand.currency.symbol}${Math.round(amount / 1_000)}k`
  return naira(amount)
}
export const num = (n: number) => nf.format(n)

export const DAY = 86_400_000

export function startOfDay(d = new Date()) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
export function addDays(d: Date | string, n: number) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
export function daysBetween(a: Date | string, b: Date | string) {
  return Math.round((startOfDay(new Date(b)).getTime() - startOfDay(new Date(a)).getTime()) / DAY)
}
export function isoDate(d: Date | string) {
  const x = new Date(d)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })
const dateFmtY = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const timeFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' })
const dayFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

export const fmtDate = (d: Date | string) => dateFmt.format(new Date(d))
export const fmtDateY = (d: Date | string) => dateFmtY.format(new Date(d))
export const fmtTime = (d: Date | string) => timeFmt.format(new Date(d))
export const fmtDay = (d: Date | string) => dayFmt.format(new Date(d))

/** "today", "tomorrow", "in 3 days", "2 days ago" */
export function relDay(d: Date | string) {
  const n = daysBetween(new Date(), d)
  if (n === 0) return 'today'
  if (n === 1) return 'tomorrow'
  if (n === -1) return 'yesterday'
  return n > 0 ? `in ${n} days` : `${-n} days ago`
}
export function timeAgo(d: Date | string) {
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
/** Small realistic network delay so loading states show. */
export const latency = (min = 250, max = 700) => sleep(min + Math.random() * (max - min))

export function initials(name: string) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

export function waLink(text?: string) {
  return `https://wa.me/${brand.contact.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return
  const keys = Object.keys(rows[0])
  const esc = (v: unknown) => `"${String(v ?? '').replaceAll('"', '""')}"`
  const csv = [keys.join(','), ...rows.map((r) => keys.map((k) => esc(r[k])).join(','))].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  a.click()
  URL.revokeObjectURL(url)
}
