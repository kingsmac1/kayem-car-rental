import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Check, CheckCheck, MoreVertical, Paperclip, Phone, RotateCcw, Send, Smile, Video, X } from 'lucide-react'
import { brand } from '@/config/brand'
import { useDb, useSession } from '@/lib/db'
import { lockScroll } from '@/lib/smooth'
import { cn, fmtTime } from '@/lib/utils'
import { aiService, newConciergeContext, type ConciergeContext } from '@/services/ai'
import { whatsappService } from '@/services/whatsapp'
import type { ChatCard, Conversation } from '@/mocks/types'
import { WhatsAppGlyph } from '@/components/site/SocialIcons'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Checkout } from '@/components/booking/Checkout'
import { ChatCardView } from './ChatCards'
import { useIsMobile } from '@/hooks/useMedia'

interface Msg {
  id: string
  from: 'customer' | 'bot' | 'agent' | 'system'
  text: string
  card?: ChatCard
  at: string
  read?: boolean
}

const SIM_ID = 'w-sim'
const uid = () => Math.random().toString(36).slice(2)

/** Floating WhatsApp button + a realistic WhatsApp-style chat simulator driven by src/services/ai.ts. */
export default function ConciergeWidget() {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [ctx, setCtx] = useState<ConciergeContext>(() => newConciergeContext())
  const ctxRef = useRef(ctx)
  const [chips, setChips] = useState<string[]>([])
  const [typing, setTyping] = useState<'bot' | 'agent' | null>(null)
  const [input, setInput] = useState('')
  const [pay, setPay] = useState<{ ref: string; amount: number } | null>(null)
  const [handedOver, setHandedOver] = useState(false)
  const handedOverRef = useRef(false)
  const busy = useRef(false)
  const scroller = useRef<HTMLDivElement>(null)
  const session = useSession()
  // Chat persona: the logged-in customer if they're on a trip, otherwise the demo customer (who is).
  const personaId = useDb((s) => (session.customerId && s.bookings.some((b) => b.customerId === session.customerId && b.status === 'active') ? session.customerId : 'c-1'))
  const customer = useDb((s) => s.customers.find((c) => c.id === personaId))
  const queue = useRef<Promise<void>>(Promise.resolve())
  const mobile = useIsMobile()
  const [nudge, setNudge] = useState(false)

  // Greeting on first open.
  useEffect(() => {
    if (!open || msgs.length) return
    const g = aiService.greeting()
    const base = { ...g.ctx, customerId: customer?.id ?? 'c-1', customerName: customer?.name.split(' ')[0] ?? 'there' }
    setCtx(base)
    ctxRef.current = base
    queue.current = queue.current.then(() => play(g.messages.map((m) => ({ ...m, from: 'bot' as const })), g.chips))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (mobile) lockScroll(open)
  }, [open, mobile])

  // A one-time nudge bubble after a few seconds on the page.
  useEffect(() => {
    const t = setTimeout(() => setNudge(true), 6000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' })
  }, [msgs, typing])

  // Mirror the simulator into the admin WhatsApp inbox.
  useEffect(() => {
    if (msgs.length < 3) return
    const conv: Conversation = {
      id: SIM_ID,
      customerName: customer?.name ?? 'Website visitor',
      phone: customer?.phone ?? '+234 800 000 0000',
      status: handedOver ? 'needs-human' : 'bot',
      topic: ctx.stage === 'breakdown' ? 'Breakdown' : ctx.bookingRef ? `Booking ${ctx.bookingRef}` : 'Concierge chat',
      unread: handedOver ? 1 : 0,
      updatedAt: new Date().toISOString(),
      messages: msgs.filter((m) => m.from !== 'system').map((m) => ({ id: m.id, from: m.from as 'customer' | 'bot' | 'agent', text: m.text, at: m.at, card: m.card })),
    }
    whatsappService.upsertFromSimulator(conv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msgs, handedOver, ctx.stage, ctx.bookingRef, customer?.id])

  /** Reveal bot messages one at a time with a typing indicator sized to each message. */
  const play = useCallback(async (list: { text: string; card?: ChatCard; from: 'bot' | 'agent' }[], nextChips: string[]) => {
    for (const m of list) {
      setTyping(m.from)
      await new Promise((r) => setTimeout(r, Math.min(1900, 450 + m.text.length * 14)))
      setTyping(null)
      setMsgs((prev) => [...prev.map((p) => (p.from === 'customer' ? { ...p, read: true } : p)), { id: uid(), from: m.from, text: m.text, card: m.card, at: new Date().toISOString() }])
      await new Promise((r) => setTimeout(r, 220))
    }
    setChips(nextChips)
  }, [])

  /** Messages are queued so replies never interleave with a reply still being typed. */
  const send = (text: string) => {
    const t = text.trim()
    if (!t) return
    setInput('')
    setChips([])
    setMsgs((prev) => [...prev, { id: uid(), from: 'customer', text: t, at: new Date().toISOString() }])
    queue.current = queue.current.then(() => respond(t))
  }

  const respond = async (t: string) => {
    busy.current = true
    const ctx = ctxRef.current
    try {
      if (handedOverRef.current) {
        await play([{ from: 'agent', text: agentReply(t) }], ['Thanks'])
      } else {
        const reply = await aiService.conciergeReply(t, ctx)
        ctxRef.current = reply.ctx
        setCtx(reply.ctx)
        await play(reply.messages.map((m) => ({ ...m, from: 'bot' as const })), reply.chips)
        if (reply.handover) {
          handedOverRef.current = true
          setHandedOver(true)
          setMsgs((prev) => [...prev, { id: uid(), from: 'system', text: 'Grace from the team joined the chat', at: new Date().toISOString() }])
          await play([{ from: 'agent', text: `Hi ${ctx.customerName}, Grace here from ${brand.shortName} 👋 I’ve read the chat — how can I help?` }], ['I need help with my booking', 'Thanks'])
        }
      }
    } finally {
      busy.current = false
    }
  }

  const reset = () => {
    setMsgs([])
    setChips([])
    setHandedOver(false)
    handedOverRef.current = false
    queue.current = Promise.resolve()
    setCtx(newConciergeContext())
    setOpen(false)
    setTimeout(() => setOpen(true), 50)
  }

  return (
    <>
      {/* Launcher */}
      <div className="fixed bottom-5 right-5 z-[85] flex items-end gap-3 md:bottom-6 md:right-6">
        <AnimatePresence>
          {nudge && !open && (
            <motion.button
              type="button"
              onClick={() => { setOpen(true); setNudge(false) }}
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="hidden max-w-[220px] rounded-2xl rounded-br-sm bg-paper px-4 py-3 text-left text-[13.5px] font-medium text-ink shadow-[0_10px_30px_-8px_rgba(0,0,0,.6)] sm:block"
            >
              Need a car today? Ask me anything — I reply instantly.
            </motion.button>
          )}
        </AnimatePresence>
        <motion.button
          type="button"
          onClick={() => { setOpen((o) => !o); setNudge(false) }}
          aria-label={open ? 'Close WhatsApp concierge' : 'Chat with us on WhatsApp'}
          aria-expanded={open}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          className="relative grid size-14 place-items-center rounded-full bg-[#25d366] text-white shadow-[0_12px_32px_-8px_rgba(37,211,102,.55)]"
        >
          {open ? <X className="size-6" /> : <WhatsAppGlyph className="size-7" />}
        </motion.button>
      </div>

      {/* Chat window */}
      <AnimatePresence>
        {open && (
          <motion.section
            role="dialog"
            aria-label={`${brand.shortName} WhatsApp concierge`}
            data-lenis-prevent
            initial={mobile ? { y: '100%' } : { opacity: 0, scale: 0.9, y: 20 }}
            animate={mobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={mobile ? { y: '100%' } : { opacity: 0, scale: 0.92, y: 16 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: 'bottom right' }}
            className="fixed inset-0 z-[86] flex flex-col overflow-hidden bg-[#0b141a] font-body text-[#e9edef] md:inset-auto md:bottom-24 md:right-6 md:h-[min(680px,calc(100dvh-120px))] md:w-[390px] md:rounded-2xl md:border md:border-white/10 md:shadow-[0_30px_80px_-20px_rgba(0,0,0,.85)]"
          >
            {/* Header */}
            <header className="flex items-center gap-3 bg-[#202c33] px-3 py-2.5">
              <button type="button" onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-full hover:bg-white/5 md:hidden" aria-label="Back">
                <ArrowLeft className="size-5" />
              </button>
              <span className="grid size-10 place-items-center rounded-full bg-accent font-display text-[17px] font-extrabold text-accent-ink">{brand.monogram}</span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 truncate text-[15px] font-semibold">
                  {brand.shortName} Concierge
                  <span className="grid size-3.5 place-items-center rounded-full bg-[#00a884]" aria-label="Verified business"><Check className="size-2.5 text-[#0b141a]" strokeWidth={4} /></span>
                </p>
                <p className="text-[12.5px] text-[#8696a0]" aria-live="polite">{typing ? 'typing…' : handedOver ? 'Grace (team) · online' : 'online · replies instantly'}</p>
              </div>
              <span className="hidden text-[#aebac1] sm:flex"><Video className="mx-2 size-5" /><Phone className="mx-2 size-[18px]" /></span>
              <button type="button" onClick={reset} className="grid size-9 place-items-center rounded-full text-[#aebac1] hover:bg-white/5" aria-label="Restart conversation" title="Restart conversation">
                <RotateCcw className="size-[18px]" />
              </button>
              <MoreVertical className="hidden size-5 text-[#aebac1] sm:block" aria-hidden />
            </header>
            <p className="bg-accent px-3 py-1 text-center text-[11px] font-semibold text-accent-ink">Demo simulator — replies come from the {brand.shortName} AI mock</p>

            {/* Messages */}
            <div
              ref={scroller}
              className="flex-1 overflow-y-auto px-3 py-4"
              style={{
                backgroundColor: '#0b141a',
                backgroundImage: 'radial-gradient(rgba(255,255,255,.035) 1px, transparent 1px), radial-gradient(rgba(255,255,255,.02) 1px, transparent 1px)',
                backgroundSize: '22px 22px, 13px 13px',
                backgroundPosition: '0 0, 7px 9px',
              }}
            >
              <p className="mx-auto mb-3 w-fit rounded-md bg-[#182229] px-3 py-1 text-[11.5px] text-[#8696a0]">Today</p>
              <p className="mx-auto mb-4 max-w-[90%] rounded-md bg-[#182229] px-3 py-2 text-center text-[11.5px] leading-snug text-[#ffd279]">
                🔒 Messages are end-to-end encrypted. This business uses a secure service to manage this chat.
              </p>
              <ul className="flex flex-col gap-1.5">
                {msgs.map((m, i) => {
                  const mine = m.from === 'customer'
                  const prev = msgs[i - 1]
                  const first = !prev || prev.from !== m.from
                  if (m.from === 'system') {
                    return <li key={m.id} className="mx-auto my-2 rounded-md bg-[#182229] px-3 py-1 text-[11.5px] text-[#8696a0]">{m.text}</li>
                  }
                  return (
                    <motion.li
                      key={m.id}
                      initial={{ opacity: 0, y: 6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.22 }}
                      className={cn('flex', mine ? 'justify-end' : 'justify-start', first && 'mt-2')}
                    >
                      <div className={cn('relative max-w-[82%] rounded-lg px-2.5 pt-1.5 pb-1 text-[14.2px] leading-[1.35] shadow-sm', mine ? 'bg-[#005c4b]' : 'bg-[#202c33]', first && (mine ? 'rounded-tr-none' : 'rounded-tl-none'))}>
                        {m.from === 'agent' && first ? <p className="mb-0.5 text-[12.5px] font-semibold text-[#ffd279]">Grace · {brand.shortName} team</p> : null}
                        <p className="whitespace-pre-line break-words">{m.text}</p>
                        {m.card ? <ChatCardView card={m.card} onPick={send} onPay={(ref, amount) => setPay({ ref, amount })} /> : null}
                        <p className="mt-0.5 flex items-center justify-end gap-1 text-[11px] text-[#8696a0]">
                          {fmtTime(m.at)}
                          {mine ? (m.read ? <CheckCheck className="size-3.5 text-[#53bdeb]" /> : <CheckCheck className="size-3.5" />) : null}
                        </p>
                      </div>
                    </motion.li>
                  )
                })}
                {typing && (
                  <li className="mt-2 flex justify-start" aria-label="typing">
                    <div className="flex gap-1 rounded-lg rounded-tl-none bg-[#202c33] px-3.5 py-3">
                      {[0, 1, 2].map((d) => (
                        <motion.span key={d} className="size-2 rounded-full bg-[#8696a0]" animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }} transition={{ duration: 0.9, repeat: Infinity, delay: d * 0.15 }} />
                      ))}
                    </div>
                  </li>
                )}
              </ul>
            </div>

            {/* Suggested replies */}
            {chips.length > 0 && !typing && (
              <div className="flex gap-2 overflow-x-auto bg-[#0b141a] px-3 pb-2 [scrollbar-width:none]">
                {chips.map((c) => (
                  <button key={c} type="button" onClick={() => send(c)} className="shrink-0 rounded-full border border-[#00a884]/50 bg-[#00a884]/10 px-3 py-1.5 text-[13px] text-[#00d9a5] hover:bg-[#00a884]/20">
                    {c}
                  </button>
                ))}
              </div>
            )}

            {/* Composer */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                send(input)
              }}
              className="flex items-center gap-2 bg-[#202c33] px-2.5 py-2"
            >
              <div className="flex flex-1 items-center gap-2 rounded-full bg-[#2a3942] px-3">
                <Smile className="size-5 shrink-0 text-[#8696a0]" aria-hidden />
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Message"
                  aria-label="Type a message"
                  className="h-10 flex-1 bg-transparent text-[15px] text-[#e9edef] outline-none placeholder:text-[#8696a0]"
                />
                <Paperclip className="size-5 shrink-0 text-[#8696a0]" aria-hidden />
              </div>
              <button type="submit" aria-label="Send" disabled={!input.trim()} className="grid size-11 shrink-0 place-items-center rounded-full bg-[#00a884] text-[#0b141a] disabled:opacity-60">
                <Send className="size-5" />
              </button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>

      <Dialog open={!!pay} onOpenChange={(o) => !o && setPay(null)}>
        {pay && (
          <DialogContent title="Pay securely" description={`Booking ${pay.ref}`} className="max-w-xl">
            <Checkout
              amount={pay.amount}
              deposit={0}
              email={customer?.email ?? ''}
              onPaid={() => {
                setPay(null)
                send('I have paid')
              }}
            />
          </DialogContent>
        )}
      </Dialog>
    </>
  )
}

function agentReply(text: string) {
  const t = text.toLowerCase()
  if (/thank/.test(t)) return 'Anytime! I’ll stay on this chat until your trip is sorted. 🙏'
  if (/booking|reservation/.test(t)) return 'Sure — I can see your bookings. I’ll call you in 2 minutes to confirm the details.'
  return 'Got it. Give me a moment to check that with the fleet desk — I’ll reply right here.'
}
