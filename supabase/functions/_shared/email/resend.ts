/** Sends a rendered email through Resend. Shared by send-email and demo-email. */
import { brand } from './ui.ts'
import type { Rendered } from './templates.ts'

export interface SendResult {
  ok: boolean
  id?: string
  error?: unknown
}

export async function sendViaResend(email: Rendered, to: string[], opts: { replyTo?: string; tags?: Record<string, string> } = {}): Promise<SendResult> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('NOTIFY_FROM_EMAIL')
  if (!apiKey || !from) return { ok: false, error: 'RESEND_API_KEY and NOTIFY_FROM_EMAIL must be set' }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: `${brand.name} <${from}>`,
      to,
      reply_to: opts.replyTo ?? brand.contact.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
      tags: Object.entries(opts.tags ?? {}).map(([name, value]) => ({ name, value })),
    }),
  })
  const out = await res.json().catch(() => ({}))
  return res.ok ? { ok: true, id: out.id } : { ok: false, error: out }
}

export const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/
