import { Link } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { upcomingPeakDates } from '@/data/content'
import { sm } from '@/data/images'
import { gsap } from '@/lib/gsap'
import { isTouch, prefersReducedMotion } from '@/lib/env'
import { addDays, cn, fmtDateY, isoDate } from '@/lib/utils'
import { RollText } from '@/components/ui/button'
import { SplitHeading } from '../Reveal'

function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

function Countdown({ to, now }: { to: Date; now: number }) {
  const diff = Math.max(0, to.getTime() - now)
  const d = Math.floor(diff / 86_400_000)
  const h = Math.floor((diff / 3_600_000) % 24)
  const m = Math.floor((diff / 60_000) % 60)
  const s = Math.floor((diff / 1000) % 60)
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    <span className="num tabular-nums" aria-label={`${d} days ${h} hours ${m} minutes to go`}>
      {d}d {pad(h)}h {pad(m)}m <span className="text-mute">{pad(s)}s</span>
    </span>
  )
}

/** Countdown + list (race-calendar style): rows light up on hover and a car image follows the row. */
export function PeakDates() {
  const dates = useMemo(() => upcomingPeakDates(), [])
  const now = useNow()
  const list = useRef<HTMLUListElement>(null)
  const follower = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)

  useEffect(() => {
    const el = list.current
    const f = follower.current
    if (!el || !f || isTouch() || prefersReducedMotion()) return
    const yTo = gsap.quickTo(f, 'y', { duration: 0.55, ease: 'power3' })
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      yTo(e.clientY - r.top - f.offsetHeight / 2)
    }
    el.addEventListener('pointermove', move)
    return () => el.removeEventListener('pointermove', move)
  }, [])

  return (
    <section className="relative border-t border-line py-24 md:py-32" aria-labelledby="peak-title">
      <div className="container-x">
        <div className="grid gap-6 md:grid-cols-2 md:items-end">
          <SplitHeading className="display text-[clamp(36px,6vw,88px)] font-extrabold uppercase tracking-[-0.04em]">
            <span id="peak-title">Upcoming peak dates</span>
          </SplitHeading>
          <p className="max-w-md text-paper/75 md:justify-self-end">These dates sell out weeks ahead. Lock in your car now at today’s rate — free cancellation up to 24 hours before pick-up.</p>
        </div>
        <div className="relative mt-14">
          <div ref={follower} className={cn('pointer-events-none absolute left-[42%] top-0 z-10 hidden w-56 transition-opacity duration-300 lg:block', hover === null ? 'opacity-0' : 'opacity-100')} aria-hidden>
            {dates.map((d, i) => (
              <img key={d.id} src={sm(d.image)} alt="" className={cn('aspect-[4/3] w-full object-cover', i === hover ? 'block' : 'hidden')} />
            ))}
          </div>
          <ul ref={list} onPointerLeave={() => setHover(null)} className="border-t border-line">
            {dates.map((d, i) => (
              <li
                key={d.id}
                onPointerEnter={() => setHover(i)}
                className={cn('grid grid-cols-1 gap-3 border-b border-line py-6 transition-colors duration-300 md:grid-cols-[1.4fr_1fr_1fr_auto] md:items-center md:gap-6', hover === i && 'text-accent')}
              >
                <div>
                  <h3 className="display text-[clamp(20px,2.2vw,30px)] font-bold uppercase tracking-[-0.02em]">{d.name}</h3>
                  <p className={cn('mt-1 text-[14px]', hover === i ? 'text-accent/80' : 'text-mute')}>{d.where} · {d.note}</p>
                </div>
                <p className="label">{fmtDateY(d.date)}</p>
                <p className="text-[17px]">
                  <Countdown to={d.date} now={now} />
                </p>
                <Link
                  to="/book"
                  search={{ start: isoDate(d.date), end: isoDate(addDays(d.date, 3)) }}
                  data-cursor="book"
                  className={cn('roll-host label inline-flex h-11 w-fit items-center border px-4 transition-colors', hover === i ? 'border-accent bg-accent text-accent-ink' : 'border-line-strong text-paper hover:border-paper')}
                >
                  <RollText>Reserve early</RollText>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
