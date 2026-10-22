import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Bot, CheckCheck, Hand, Send, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { brand } from '@/config/brand'
import { currentStaff, useDb } from '@/lib/db'
import { cn, fmtTime, timeAgo } from '@/lib/utils'
import type { Conversation } from '@/mocks/types'
import { whatsappService } from '@/services/whatsapp'
import { AdminTitle, Segmented } from '@/components/admin/kit'
import { Button } from '@/components/ui/button'
import { Avatar, Pill } from '@/components/ui/misc'

const STATUS: Record<Conversation['status'], { tone: 'accent' | 'bad' | 'ok' | 'mute'; label: string }> = {
  bot: { tone: 'accent', label: 'Bot handling' },
  'needs-human': { tone: 'bad', label: 'Needs human' },
  human: { tone: 'ok', label: 'Staff handling' },
  closed: { tone: 'mute', label: 'Closed' },
}

export default function Inbox() {
  const convs = useDb((s) => [...s.conversations].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)))
  const [filter, setFilter] = useState<'all' | Conversation['status']>('all')
  const [openId, setOpenId] = useState<string | null>(convs.find((c) => c.status === 'needs-human')?.id ?? convs[0]?.id ?? null)
  const [text, setText] = useState('')
  const [mobileThread, setMobileThread] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  const list = convs.filter((c) => filter === 'all' || c.status === filter)
  const sel = convs.find((c) => c.id === openId)

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [sel?.messages.length, openId])

  const send = async () => {
    if (!sel || !text.trim()) return
    if (sel.status === 'bot' || sel.status === 'needs-human') await whatsappService.setStatus(sel.id, 'human')
    await whatsappService.sendMessage(sel.id, text.trim(), 'agent')
    setText('')
  }

  return (
    <div>
      <AdminTitle title="WhatsApp inbox" sub="Every concierge conversation. The bot handles most; take over any chat in one tap." >
        <Segmented label="Filter" value={filter} onChange={setFilter} options={[{ id: 'all', label: 'All' }, { id: 'needs-human', label: 'Needs human' }, { id: 'bot', label: 'Bot' }, { id: 'human', label: 'Staff' }, { id: 'closed', label: 'Closed' }]} />
      </AdminTitle>
      <div className="grid h-[calc(100dvh-210px)] min-h-[520px] overflow-hidden border border-line bg-ink-2 md:grid-cols-[320px_1fr]">
        <ul className={cn('overflow-y-auto border-r border-line', mobileThread && 'hidden md:block')} data-lenis-prevent>
          {list.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => { setOpenId(c.id); setMobileThread(true) }} className={cn('flex w-full gap-3 border-b border-line px-3 py-3 text-left hover:bg-paper/[0.03]', openId === c.id && 'bg-accent/8')}>
                <Avatar name={c.customerName} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2"><span className="truncate text-[13.5px] font-semibold">{c.customerName}</span><span className="shrink-0 text-[11px] text-mute">{timeAgo(c.updatedAt)}</span></span>
                  <span className="block truncate text-[12.5px] text-mute">{c.messages.at(-1)?.text}</span>
                  <span className="mt-1 flex items-center gap-2"><Pill tone={STATUS[c.status].tone} className="!text-[10.5px]">{STATUS[c.status].label}</Pill><span className="text-[11.5px] text-mute">{c.topic}</span>{c.unread ? <span className="ml-auto rounded-full bg-bad px-1.5 text-[11px] font-bold text-ink">{c.unread}</span> : null}</span>
                </span>
              </button>
            </li>
          ))}
          {!list.length && <li className="p-4 text-[13px] text-mute">No conversations here.</li>}
        </ul>
        {sel ? (
          <section className={cn('flex min-h-0 flex-col', !mobileThread && 'hidden md:flex')} aria-label={`Chat with ${sel.customerName}`}>
            <header className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-2.5">
              <button type="button" className="md:hidden" onClick={() => setMobileThread(false)} aria-label="Back to list"><ArrowLeft className="size-5" /></button>
              <Avatar name={sel.customerName} />
              <div className="min-w-0 flex-1"><p className="truncate text-[14px] font-semibold">{sel.customerName}</p><p className="text-[12px] text-mute">{sel.phone} · {sel.topic}</p></div>
              <Pill tone={STATUS[sel.status].tone}>{STATUS[sel.status].label}</Pill>
              {sel.status !== 'human' && sel.status !== 'closed' && <Button size="appSm" icon={<Hand className="size-3.5" />} onClick={async () => { await whatsappService.takeOver(sel.id, currentStaff().name); toast.success('You’ve taken over this chat') }}>Take over</Button>}
              {sel.status === 'human' && <Button size="appSm" variant="subtle" icon={<Bot className="size-3.5" />} onClick={() => whatsappService.setStatus(sel.id, 'bot')}>Hand back to bot</Button>}
              {sel.status !== 'closed' && <Button size="appSm" variant="subtle" onClick={() => whatsappService.setStatus(sel.id, 'closed')}>Close</Button>}
            </header>
            <div className="flex-1 overflow-y-auto bg-[#0b141a] px-4 py-4" data-lenis-prevent>
              <ul className="flex flex-col gap-1.5">
                {sel.messages.map((m) => {
                  const mine = m.from !== 'customer'
                  return (
                    <li key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                      <div className={cn('max-w-[78%] rounded-lg px-2.5 pt-1.5 pb-1 text-[13.5px] leading-snug text-[#e9edef]', mine ? (m.from === 'bot' ? 'bg-[#1f3b36]' : 'bg-[#005c4b]') : 'bg-[#202c33]')}>
                        {mine && <p className="mb-0.5 flex items-center gap-1 text-[11px] font-semibold text-[#ffd279]">{m.from === 'bot' ? <><Bot className="size-3" />{brand.shortName} AI</> : <><UserRound className="size-3" />Staff</>}</p>}
                        <p className="whitespace-pre-line">{m.text}</p>
                        <p className="mt-0.5 flex items-center justify-end gap-1 text-[10.5px] text-[#8696a0]">{fmtTime(m.at)}{mine && <CheckCheck className="size-3 text-[#53bdeb]" />}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
              <div ref={end} />
            </div>
            <form onSubmit={(e) => { e.preventDefault(); send() }} className="flex gap-2 border-t border-line p-3">
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder={sel.status === 'closed' ? 'Chat closed — sending will reopen it' : sel.status === 'human' ? 'Type a reply…' : 'Typing will take over from the bot'} aria-label="Reply" className="h-10 flex-1 rounded-[2px] border border-line bg-ink-3 px-3 text-[14px] focus:border-accent focus:outline-none" />
              <Button type="submit" size="app" className="h-10" disabled={!text.trim()} icon={<Send className="size-4" />}>Send</Button>
            </form>
          </section>
        ) : <div className="hidden place-items-center text-mute md:grid">Select a conversation</div>}
      </div>
    </div>
  )
}
