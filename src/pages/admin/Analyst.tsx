import { BrandMark } from '@/components/BrandMark'
import { useEffect, useRef, useState } from 'react'
import { Bot, Send, Sparkles } from 'lucide-react'
import { brand } from '@/config/brand'
import { useDb } from '@/lib/db'
import { cn, waLink } from '@/lib/utils'
import { analystAnswer, ANALYST_SUGGESTIONS, dailySummary, type AnalystAnswer } from '@/services/ai'
import { AdminTitle } from '@/components/admin/kit'
import { Bars, TrendChart } from '@/components/admin/charts'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/ui/misc'
import { WhatsAppGlyph } from '@/components/site/SocialIcons'

interface Turn {
  id: number
  q: string
  a?: AnalystAnswer
}

/** Renders **bold** segments from analyst text. */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/).map((part, i) => (part.startsWith('**') ? <strong key={i} className="text-accent">{part.slice(2, -2)}</strong> : <span key={i}>{part}</span>))}
    </>
  )
}

export default function Analyst() {
  const s = useDb((x) => x)
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [turns])

  const ask = async (q: string) => {
    const question = q.trim()
    if (!question || busy) return
    const id = Date.now()
    setInput('')
    setBusy(true)
    setTurns((t) => [...t, { id, q: question }])
    const a = await analystAnswer(question, s)
    setTurns((t) => t.map((x) => (x.id === id ? { ...x, a } : x)))
    setBusy(false)
  }

  const summary = dailySummary(s)

  return (
    <div>
      <AdminTitle title="AI business analyst" sub="Ask about your business in plain English. Every answer is calculated from your live data." />
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="flex min-h-[560px] min-w-0 flex-col border border-line bg-ink-2" aria-label="Analyst chat">
          <div className="flex-1 overflow-y-auto p-4" data-lenis-prevent>
            {!turns.length && (
              <div className="py-8 text-center">
                <Sparkles className="mx-auto size-8 text-accent" />
                <p className="mt-3 font-semibold">What do you want to know?</p>
                <p className="mx-auto mt-1 max-w-sm text-[13.5px] text-mute">Try one of these, or type your own question.</p>
              </div>
            )}
            <ul className="flex flex-col gap-5">
              {turns.map((t) => (
                <li key={t.id} className="flex flex-col gap-3">
                  <p className="ml-auto max-w-[80%] rounded-[2px] bg-accent px-3 py-2 text-[14px] font-medium text-accent-ink">{t.q}</p>
                  <div className="flex gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-paper/10"><Bot className="size-4 text-accent" /></span>
                    <div className="min-w-0 flex-1 text-[14px] leading-relaxed">
                      {!t.a ? (
                        <p className="flex items-center gap-1.5 text-mute">Crunching the numbers<span className="animate-pulse">…</span></p>
                      ) : (
                        <>
                          <p><Rich text={t.a.text} /></p>
                          {t.a.chart && (
                            <div className="mt-3 border border-line bg-ink p-3">
                              {t.a.chart.kind === 'trend' ? <TrendChart data={t.a.chart.data} x={t.a.chart.x} y={t.a.chart.y} height={200} money={t.a.chart.money} /> : <Bars data={t.a.chart.data} x={t.a.chart.x} y={t.a.chart.y} height={200} money={t.a.chart.money} unit={t.a.chart.unit} />}
                            </div>
                          )}
                          {t.a.table && (
                            <div className="mt-3 overflow-x-auto border border-line">
                              <table className="w-full min-w-[420px] text-[13px]">
                                <thead><tr>{t.a.table.columns.map((c) => <th key={c} scope="col" className="border-b border-line px-3 py-2 text-left text-xs font-semibold text-mute">{c}</th>)}</tr></thead>
                                <tbody>
                                  {t.a.table.rows.map((r, i) => (
                                    <tr key={i}>{r.map((v, k) => <td key={k} className={cn('border-b border-line px-3 py-2', typeof v === 'number' || /^[₦\d]/.test(String(v)) ? 'num' : '')}>{v}</td>)}</tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div ref={end} />
          </div>
          <div className="border-t border-line p-3">
            <div className="mb-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
              {ANALYST_SUGGESTIONS.map((q) => (
                <button key={q} type="button" onClick={() => ask(q)} disabled={busy} className="shrink-0 rounded-full border border-line px-3 py-1.5 text-[12.5px] text-paper/80 hover:border-accent hover:text-accent disabled:opacity-50">
                  {q}
                </button>
              ))}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); ask(input) }} className="flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="e.g. Which car made the least money last month?" aria-label="Ask the analyst" className="h-10 flex-1 rounded-[2px] border border-line bg-ink-3 px-3 text-[14px] focus:border-accent focus:outline-none" />
              <Button type="submit" size="app" className="h-10" disabled={!input.trim()} loading={busy} icon={<Send className="size-4" />}>Ask</Button>
            </form>
          </div>
        </section>

        <Panel title="Daily WhatsApp summary (preview)" action={<span className="text-[12px] text-mute">Sent 7:00am</span>}>
          <div className="rounded-lg bg-[#0b141a] p-3">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
              <BrandMark round className="size-8" />
              <span className="text-[13px] font-semibold text-[#e9edef]">{brand.shortName} Rental OS</span>
            </div>
            <div className="mt-3 max-w-[92%] rounded-lg rounded-tl-none bg-[#202c33] px-3 py-2 text-[13.5px] leading-relaxed text-[#e9edef]">
              <pre className="whitespace-pre-wrap font-body">{summary}</pre>
              <p className="mt-1 text-right text-[11px] text-[#8696a0]">07:00</p>
            </div>
          </div>
          <p className="mt-3 text-[12.5px] text-mute">Numbers update live from today’s bookings. In production this is sent by a scheduled job through the WhatsApp Business API.</p>
          <Button size="app" variant="subtle" className="mt-3" asChild icon={<WhatsAppGlyph className="size-4" />}>
            <a href={waLink(summary)} target="_blank" rel="noreferrer">Send a test to WhatsApp</a>
          </Button>
        </Panel>
      </div>
    </div>
  )
}
