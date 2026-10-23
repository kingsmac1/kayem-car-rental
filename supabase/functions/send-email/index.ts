/**
 * send-email — renders a branded template and sends it through Resend.
 *
 * Internal only: callers (other Edge Functions, pg_cron jobs, the admin backend)
 * must send `x-email-secret: <EMAIL_FUNCTION_SECRET>`. Browsers never call this.
 *
 *   POST /functions/v1/send-email
 *   { "template": "booking_confirmed", "to": "ada@example.com", "data": { ... }, "replyTo"?: "..." }
 *
 * Secrets (supabase secrets set ...): RESEND_API_KEY, NOTIFY_FROM_EMAIL, EMAIL_FUNCTION_SECRET
 */
import { brand } from '../_shared/email/ui.ts'
import { render, templates, type TemplateName } from '../_shared/email/templates.ts'

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/** Constant-time compare so the secret can't be guessed one character at a time. */
function sameSecret(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Use POST' })

  const secret = Deno.env.get('EMAIL_FUNCTION_SECRET') ?? ''
  if (!sameSecret(req.headers.get('x-email-secret') ?? '', secret)) return json(401, { error: 'Not allowed' })

  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('NOTIFY_FROM_EMAIL')
  if (!apiKey || !from) return json(500, { error: 'RESEND_API_KEY and NOTIFY_FROM_EMAIL must be set' })

  let payload: { template?: string; to?: string | string[]; data?: unknown; replyTo?: string }
  try {
    payload = await req.json()
  } catch {
    return json(400, { error: 'Body must be JSON' })
  }

  const { template, data, replyTo } = payload
  const to = Array.isArray(payload.to) ? payload.to : payload.to ? [payload.to] : []
  if (!template || !(template in templates)) return json(400, { error: `Unknown template. Use one of: ${Object.keys(templates).join(', ')}` })
  if (!to.length || to.length > 10 || !to.every((t) => EMAIL_RE.test(t))) return json(400, { error: 'to must be 1 to 10 valid email addresses' })

  let email
  try {
    // deno-lint-ignore no-explicit-any
    email = render(template as TemplateName, (data ?? {}) as any)
  } catch (err) {
    return json(400, { error: `Template data is incomplete: ${(err as Error).message}` })
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: `${brand.name} <${from}>`,
      to,
      reply_to: replyTo ?? brand.contact.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
      tags: [{ name: 'template', value: template }],
    }),
  })

  const out = await res.json().catch(() => ({}))
  if (!res.ok) return json(502, { error: 'Resend rejected the email', detail: out })
  return json(200, { id: out.id })
})
