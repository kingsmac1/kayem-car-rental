/**
 * send-email — renders a branded template and sends it through Resend.
 *
 * Internal only: callers (other Edge Functions, pg_cron jobs, the admin backend)
 * must send `x-email-secret: <EMAIL_FUNCTION_SECRET>`. Browsers never call this;
 * the public demo uses demo-email, which only allows customer templates.
 *
 *   POST /functions/v1/send-email
 *   { "template": "booking_confirmed", "to": "ada@example.com", "data": { ... }, "replyTo"?: "..." }
 *
 * Secrets (supabase secrets set ...): RESEND_API_KEY, NOTIFY_FROM_EMAIL, EMAIL_FUNCTION_SECRET
 */
import { render, templates, type TemplateName } from '../_shared/email/templates.ts'
import { EMAIL_RE, sendViaResend } from '../_shared/email/resend.ts'

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/** Constant-time compare so the secret can't be guessed one character at a time. */
function sameSecret(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Use POST' })

  const secret = Deno.env.get('EMAIL_FUNCTION_SECRET') ?? ''
  if (!sameSecret(req.headers.get('x-email-secret') ?? '', secret)) return json(401, { error: 'Not allowed' })

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

  const sent = await sendViaResend(email, to, { replyTo, tags: { template } })
  return sent.ok ? json(200, { id: sent.id }) : json(502, { error: 'Resend rejected the email', detail: sent.error })
})
