/**
 * WhatsApp Business — inbound/outbound messages and the conversation list.
 * TODO: connect real provider — receive messages through a WhatsApp Cloud API
 * webhook (Supabase Edge Function), store them in `wa_messages`, reply with
 * POST /{phone-number-id}/messages, and let ai.ts draft bot replies.
 */
import { audit, db } from '@/lib/db'
import { latency } from '@/lib/utils'
import type { ChatMessage, Conversation } from '@/mocks/types'

export const whatsappService = {
  async listConversations() {
    await latency(150, 350)
    return [...db.get().conversations].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
  },

  async sendMessage(conversationId: string, text: string, from: ChatMessage['from'] = 'agent') {
    await latency(200, 500)
    const msg: ChatMessage = { id: `m-${Date.now()}`, from, text, at: new Date().toISOString() }
    db.set((d) => {
      const c = d.conversations.find((x) => x.id === conversationId)
      if (c) {
        c.messages.push(msg)
        c.updatedAt = msg.at
        c.unread = 0
      }
    })
    return msg
  },

  async takeOver(conversationId: string, agent: string) {
    await latency()
    db.set((d) => {
      const c = d.conversations.find((x) => x.id === conversationId)
      if (c) {
        c.status = 'human'
        c.unread = 0
        c.messages.push({ id: `m-${Date.now()}`, from: 'agent', text: `${agent.split(' ')[0]} from the team here — I’ve got this from now. How can I help?`, at: new Date().toISOString() })
        c.updatedAt = new Date().toISOString()
      }
    })
    audit(`Took over WhatsApp chat`)
  },

  async setStatus(conversationId: string, status: Conversation['status']) {
    await latency(100, 250)
    db.set((d) => {
      const c = d.conversations.find((x) => x.id === conversationId)
      if (c) c.status = status
    })
  },

  /** Saves a concierge-simulator conversation into the admin inbox. */
  upsertFromSimulator(conv: Conversation) {
    db.set((d) => {
      const i = d.conversations.findIndex((c) => c.id === conv.id)
      if (i >= 0) d.conversations[i] = conv
      else d.conversations.unshift(conv)
    })
  },
}
