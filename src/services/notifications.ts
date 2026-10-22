/**
 * Notifications — reminders and alerts by email and WhatsApp.
 * TODO: connect real provider — send email via Resend/Postmark and WhatsApp
 * template messages via the WhatsApp Business Cloud API, triggered by
 * Supabase cron (pg_cron) for reminders such as "return due in 2 hours".
 */
import { sleep } from '@/lib/utils'

export type Channel = 'email' | 'whatsapp' | 'sms'

export interface OutboundMessage {
  id: string
  to: string
  channel: Channel
  template: 'booking_confirmed' | 'pickup_reminder' | 'return_reminder' | 'deposit_refunded' | 'review_request' | 'owner_daily_summary' | 'alert'
  body: string
  sentAt: string
}

const outbox: OutboundMessage[] = []

export const notificationService = {
  async send(to: string, channel: Channel, template: OutboundMessage['template'], body: string) {
    await sleep(400)
    const msg = { id: `n-${Date.now()}`, to, channel, template, body, sentAt: new Date().toISOString() }
    outbox.unshift(msg)
    return msg
  },
  async remind(bookingRef: string, phone: string, kind: 'pickup' | 'return') {
    return this.send(phone, 'whatsapp', kind === 'pickup' ? 'pickup_reminder' : 'return_reminder', `Reminder for ${bookingRef}: your ${kind} is coming up. Reply HELP for support.`)
  },
  async requestReview(phone: string, name: string) {
    return this.send(phone, 'whatsapp', 'review_request', `Hi ${name.split(' ')[0]}, thanks for riding with us! Mind leaving a quick Google review? g.page/r/demo-review`)
  },
  sent: () => outbox,
}
