/**
 * demo-email — lets the public demo send real branded emails to the address a
 * visitor typed in (bookings, sign-up, enquiries), so prospects experience the
 * product end to end.
 *
 * The browser calls this directly, so nothing it sends is trusted:
 *  - only customer-facing templates are allowed; staff templates are never sendable
 *  - every field is rebuilt from a whitelist, length-capped and stripped of links,
 *    and every button URL is set here, never taken from the request
 *  - sends are rate-limited per recipient, per visitor IP and per day overall
 *    (demo_email_allow in the database), so the domain can't be used to spam
 *
 *   POST /functions/v1/demo-email  { "template": "booking_confirmed", "to": "...", "data": { ... } }
 *
 * Secrets: RESEND_API_KEY, NOTIFY_FROM_EMAIL, EMAIL_FUNCTION_SECRET (hash salt).
 * Optional: DEMO_OWNER_EMAIL (enquiry alerts; defaults to brand contact email),
 * DEMO_EMAIL_PER_RECIPIENT (6), DEMO_EMAIL_PER_IP (25), DEMO_EMAIL_DAILY_CAP (90),
 * DEMO_REVIEW_URL.
 */
import { brand } from '../_shared/email/ui.ts'
import { render, type EnquiryKind, type TemplateData, type TemplateName } from '../_shared/email/templates.ts'
import { EMAIL_RE, sendViaResend } from '../_shared/email/resend.ts'

const site = brand.siteUrl
const ALLOWED_ORIGINS = [site, 'https://kayem.pages.dev', 'http://localhost:5173', 'http://127.0.0.1:5173']
const PREVIEW_ORIGIN = /^https:\/\/[a-z0-9-]+\.kayem\.pages\.dev$/

const env = (k: string, d: number) => Number(Deno.env.get(k)) || d

function cors(origin: string | null) {
  const allowed = origin && (ALLOWED_ORIGINS.includes(origin) || PREVIEW_ORIGIN.test(origin))
  return {
    'access-control-allow-origin': allowed ? origin : site,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type, authorization, apikey, x-client-info',
    vary: 'Origin',
  }
}

// ---- sanitising ---------------------------------------------------------------

class BadInput extends Error {}

const LINKISH = /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?:\/\S*)?/gi

/** Free text shown to a recipient: no links, no control characters, capped. */
function text(v: unknown, max: number, required = false): string {
  const s = typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(LINKISH, '').replace(/\s+/g, ' ').trim().slice(0, max) : ''
  if (required && !s) throw new BadInput('missing text field')
  return s
}

function num(v: unknown, min: number, max: number): number {
  const n = Math.round(Number(v))
  if (!Number.isFinite(n)) throw new BadInput('bad number')
  return Math.min(max, Math.max(min, n))
}

function iso(v: unknown): string {
  const t = new Date(typeof v === 'string' ? v : NaN).getTime()
  const year = 366 * 86_400_000
  if (!Number.isFinite(t) || Math.abs(t - Date.now()) > year) throw new BadInput('bad date')
  return new Date(t).toISOString()
}

function ref(v: unknown): string {
  const s = typeof v === 'string' ? v.trim() : ''
  if (!/^[A-Z]{2,5}-\d{3,7}$/.test(s)) throw new BadInput('bad booking reference')
  return s
}

const CAR_IMAGE = new RegExp(`^${site.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/email/cars/[a-z0-9-]+\\.jpg$`)

function car(v: unknown) {
  const c = (v ?? {}) as Record<string, unknown>
  const image = typeof c.image === 'string' && CAR_IMAGE.test(c.image) ? c.image : undefined
  return { name: text(c.name, 60, true), plate: text(c.plate, 15) || undefined, image }
}

const money = (v: unknown) => num(v, 0, 100_000_000)
const mode = (v: unknown) => (v === 'chauffeur' ? 'chauffeur' : 'self-drive') as 'chauffeur' | 'self-drive'
const account = `${site}/account`

type Clean = { [T in TemplateName]?: (d: Record<string, unknown>) => TemplateData<T> }

const clean: Clean = {
  booking_confirmed: (d) => ({
    name: text(d.name, 50, true),
    ref: ref(d.ref),
    car: car(d.car),
    start: iso(d.start),
    end: iso(d.end),
    pickup: text(d.pickup, 80, true),
    dropoff: text(d.dropoff, 80, true),
    mode: mode(d.mode),
    chauffeurName: text(d.chauffeurName, 50) || undefined,
    lines: (Array.isArray(d.lines) ? d.lines : []).slice(0, 10).map((l) => ({ label: text(l?.label, 50, true), amount: num(l?.amount, -100_000_000, 100_000_000) })),
    total: money(d.total),
    paid: money(d.paid),
    deposit: money(d.deposit),
    manageUrl: account,
    status: d.status === 'pending' ? 'pending' : 'confirmed',
  }),
  booking_extended: (d) => ({
    name: text(d.name, 50, true),
    ref: ref(d.ref),
    car: car(d.car),
    days: num(d.days, 1, 60),
    previousEnd: iso(d.previousEnd),
    newEnd: iso(d.newEnd),
    dropoff: text(d.dropoff, 80, true),
    extra: money(d.extra),
    total: money(d.total),
    manageUrl: account,
  }),
  booking_cancelled: (d) => ({ name: text(d.name, 50, true), ref: ref(d.ref), car: car(d.car), start: iso(d.start), refund: money(d.refund), bookUrl: `${site}/fleet` }),
  pickup_reminder: (d) => {
    const ch = d.chauffeur as Record<string, unknown> | undefined
    return {
      name: text(d.name, 50, true),
      ref: ref(d.ref),
      car: car(d.car),
      start: iso(d.start),
      pickup: text(d.pickup, 80, true),
      mode: mode(d.mode),
      chauffeur: ch ? { name: text(ch.name, 50, true), phone: text(ch.phone, 20, true) } : undefined,
      manageUrl: account,
    }
  },
  return_reminder: (d) => ({ name: text(d.name, 50, true), ref: ref(d.ref), car: car(d.car), end: iso(d.end), dropoff: text(d.dropoff, 80, true), extendUrl: account }),
  deposit_refunded: (d) => ({
    name: text(d.name, 50, true),
    ref: ref(d.ref),
    deposit: money(d.deposit),
    deductions: (Array.isArray(d.deductions) ? d.deductions : []).slice(0, 8).map((x) => ({ label: text(x?.label, 50, true), amount: money(x?.amount) })),
    method: text(d.method, 40) || 'The card you paid with',
    detailsUrl: account,
  }),
  review_request: (d) => ({ name: text(d.name, 50, true), ref: ref(d.ref), car: car(d.car), reviewUrl: Deno.env.get('DEMO_REVIEW_URL') ?? site }),
  welcome: (d) => ({ name: text(d.name, 50, true), points: num(d.points ?? 0, 0, 5000), fleetUrl: `${site}/fleet` }),
  enquiry_received: (d) => ({ kind: enquiryKind(d.kind), name: text(d.name, 50, true) }),
}

function enquiryKind(v: unknown): EnquiryKind {
  if (v === 'contact' || v === 'corporate' || v === 'partner') return v
  throw new BadInput('bad enquiry kind')
}

/** The owner's copy of an enquiry. Only ever sent to the owner address, so the message is kept (escaped by the template). */
function ownerAlert(d: Record<string, unknown>, from: string) {
  const fields = (Array.isArray(d.fields) ? d.fields : [])
    .slice(0, 10)
    .map((f) => [String(f?.[0] ?? '').slice(0, 30), String(f?.[1] ?? '').replace(/\s+/g, ' ').slice(0, 120)] as [string, string])
    .filter(([l, v]) => l && v)
  return render('new_enquiry', {
    kind: enquiryKind(d.kind),
    fields: [...fields, ['Email', from]],
    message: typeof d.message === 'string' ? d.message.slice(0, 1500) : undefined,
    adminUrl: `${site}/admin`,
  })
}

// ---- rate limit -----------------------------------------------------------------

async function hash(value: string) {
  const salt = Deno.env.get('EMAIL_FUNCTION_SECRET') ?? ''
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${value.toLowerCase()}`))
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Returns null when allowed, or the limit that was hit. */
async function allow(ip: string, recipient: string, template: string, count: number): Promise<string | null> {
  const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/rpc/demo_email_allow`, {
    method: 'POST',
    headers: {
      apikey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      p_ip: await hash(ip),
      p_recipient: await hash(recipient),
      p_template: template,
      p_count: count,
      p_per_recipient: env('DEMO_EMAIL_PER_RECIPIENT', 6),
      p_per_ip: env('DEMO_EMAIL_PER_IP', 25),
      p_daily_cap: env('DEMO_EMAIL_DAILY_CAP', 90),
    }),
  })
  if (!res.ok) return 'limiter unavailable'
  const verdict = await res.json()
  return verdict === 'ok' ? null : String(verdict)
}

// ---- handler --------------------------------------------------------------------

Deno.serve(async (req) => {
  const headers = { ...cors(req.headers.get('origin')), 'content-type': 'application/json' }
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers })
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers })
  if (req.method !== 'POST') return reply(405, { error: 'Use POST' })

  let payload: { template?: string; to?: unknown; data?: unknown }
  try {
    payload = await req.json()
  } catch {
    return reply(400, { error: 'Body must be JSON' })
  }

  const template = payload.template as TemplateName
  const to = typeof payload.to === 'string' ? payload.to.trim().slice(0, 120) : ''
  const cleaner = clean[template] as ((d: Record<string, unknown>) => unknown) | undefined
  if (!cleaner) return reply(400, { error: 'This email cannot be sent from the demo' })
  if (!EMAIL_RE.test(to) || /\.demo$/i.test(to)) return reply(400, { error: 'Enter a real email address' })

  const raw = (payload.data ?? {}) as Record<string, unknown>
  let email
  try {
    // deno-lint-ignore no-explicit-any
    email = render(template, cleaner(raw) as any)
  } catch (err) {
    return reply(400, { error: err instanceof BadInput ? `Invalid data: ${err.message}` : 'Invalid data' })
  }

  const isEnquiry = template === 'enquiry_received'
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('cf-connecting-ip') || 'unknown'
  const limited = await allow(ip, to, template, isEnquiry ? 2 : 1)
  if (limited) return reply(429, { sent: false, reason: limited })

  const sent = await sendViaResend(email, [to], { tags: { template, source: 'demo' } })
  if (!sent.ok) {
    console.error('resend', sent.error)
    return reply(502, { sent: false, reason: 'email provider error' })
  }

  if (isEnquiry) {
    const owner = Deno.env.get('DEMO_OWNER_EMAIL') ?? brand.contact.email
    const alert = await sendViaResend(ownerAlert(raw, to), [owner], { replyTo: to, tags: { template: 'new_enquiry', source: 'demo' } })
    if (!alert.ok) console.error('resend owner alert', alert.error)
  }

  return reply(200, { sent: true })
})
