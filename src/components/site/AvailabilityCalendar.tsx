import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { DemoState } from '@/mocks/types'
import { addDays, cn, isoDate, startOfDay } from '@/lib/utils'

const BLOCKING = ['pending', 'confirmed', 'active']

/** Month grid showing booked days for one car; optional range selection. */
export function AvailabilityCalendar({ state, carId, start, end, onSelect }: { state: DemoState; carId: string; start?: string; end?: string; onSelect?: (start: string, end: string) => void }) {
  const today = startOfDay()
  const [offset, setOffset] = useState(0)
  const [anchor, setAnchor] = useState<string | null>(null)

  const booked = useMemo(() => {
    const set = new Set<string>()
    for (const b of state.bookings) {
      if (b.carId !== carId || !BLOCKING.includes(b.status)) continue
      for (let d = startOfDay(new Date(b.start)); d <= new Date(b.end); d = addDays(d, 1)) set.add(isoDate(d))
    }
    return set
  }, [state.bookings, carId])

  const months = [0, 1].map((k) => new Date(today.getFullYear(), today.getMonth() + offset + k, 1))

  const pick = (day: string) => {
    if (!onSelect) return
    if (!anchor) {
      setAnchor(day)
      onSelect(day, isoDate(addDays(day, 1)))
    } else {
      const [a, b] = day > anchor ? [anchor, day] : [day, anchor]
      setAnchor(null)
      onSelect(a, b === a ? isoDate(addDays(a, 1)) : b)
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4 text-[13px] text-mute">
          <span className="inline-flex items-center gap-2"><span className="size-3 border border-line bg-ink-3" /> Free</span>
          <span className="inline-flex items-center gap-2"><span className="size-3 bg-bad/70" /> Booked</span>
          {onSelect ? <span className="inline-flex items-center gap-2"><span className="size-3 bg-accent" /> Your dates</span> : null}
        </div>
        <div className="flex gap-1">
          <button type="button" className="grid size-9 place-items-center border border-line hover:border-paper disabled:opacity-30" onClick={() => setOffset((o) => o - 1)} disabled={offset === 0} aria-label="Previous month">
            <ChevronLeft className="size-4" />
          </button>
          <button type="button" className="grid size-9 place-items-center border border-line hover:border-paper disabled:opacity-30" onClick={() => setOffset((o) => o + 1)} disabled={offset >= 10} aria-label="Next month">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      <div className="grid gap-8 sm:grid-cols-2">
        {months.map((m) => {
          const first = (m.getDay() + 6) % 7 // Monday-first
          const days = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate()
          return (
            <div key={m.toISOString()}>
              <p className="label mb-3">{m.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
              <div className="grid grid-cols-7 gap-1 text-center">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                  <span key={i} className="label !text-[9px] text-mute">{d}</span>
                ))}
                {Array.from({ length: first }, (_, i) => <span key={`e${i}`} />)}
                {Array.from({ length: days }, (_, i) => {
                  const date = new Date(m.getFullYear(), m.getMonth(), i + 1)
                  const key = isoDate(date)
                  const past = date < today
                  const isBooked = booked.has(key)
                  const selected = start && end && key >= start && key <= end
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={past || isBooked || !onSelect}
                      onClick={() => pick(key)}
                      aria-label={`${date.toDateString()}${isBooked ? ', booked' : past ? ', past' : ', free'}`}
                      className={cn(
                        'num aspect-square text-[13px] transition-colors',
                        past ? 'text-paper/20' : isBooked ? 'bg-bad/25 text-bad line-through' : 'bg-ink-3 text-paper',
                        selected && !isBooked && 'bg-accent text-accent-ink',
                        onSelect && !past && !isBooked && 'hover:outline hover:outline-1 hover:outline-accent',
                        !onSelect && 'cursor-default',
                      )}
                    >
                      {i + 1}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
