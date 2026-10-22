import { carName } from '@/mocks/cars'
import { locationName } from '@/mocks/locations'
import type { Car } from '@/mocks/types'
import type { Quote } from '@/lib/pricing'
import { cn, fmtDay, fmtTime, naira } from '@/lib/utils'
import { sm } from '@/data/images'
import { endOf, startOf, type Draft } from './types'

/** Running price summary shown beside every step. */
export function Summary({ car, draft, q, className }: { car?: Car; draft: Draft; q: Quote | null; className?: string }) {
  if (!car) {
    return (
      <aside className={cn('border border-line bg-ink-2 p-5 text-[15px] text-mute', className)}>
        Choose a car to see your price.
      </aside>
    )
  }
  const s = startOf(draft)
  const e = endOf(draft)
  return (
    <aside className={cn('border border-line bg-ink-2', className)} aria-label="Price summary">
      <div className="flex gap-4 border-b border-line p-4">
        <img src={sm(car.image)} alt="" className="aspect-[4/3] w-24 object-cover" />
        <div className="min-w-0">
          <p className="font-display text-[15px] font-bold leading-tight">{carName(car)}</p>
          <p className="label mt-1.5 text-mute">{car.city} / {draft.mode === 'chauffeur' ? 'Chauffeur' : 'Self-drive'}</p>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-3 border-b border-line p-4 text-[13.5px]">
        <div>
          <dt className="label !text-[9px] text-mute">Pick-up</dt>
          <dd className="mt-1 font-semibold">{isNaN(+s) ? '—' : `${fmtDay(s)}, ${fmtTime(s)}`}</dd>
          <dd className="text-mute">{draft.pickup ? locationName(draft.pickup) : '—'}</dd>
        </div>
        <div>
          <dt className="label !text-[9px] text-mute">Return</dt>
          <dd className="mt-1 font-semibold">{isNaN(+e) ? '—' : `${fmtDay(e)}, ${fmtTime(e)}`}</dd>
          <dd className="text-mute">{draft.dropoff ? locationName(draft.dropoff) : '—'}</dd>
        </div>
      </dl>
      {q ? (
        <div className="p-4">
          <ul className="flex flex-col gap-2 text-[13.5px]">
            {q.lines.map((l) => (
              <li key={l.label} className="flex justify-between gap-4">
                <span className="text-paper/75">{l.label}</span>
                <span className={cn('num shrink-0', l.amount < 0 && 'text-ok')}>{naira(l.amount)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between border-t border-line pt-3 text-[15px] font-semibold">
            <span>Rental total</span>
            <span className="num">{naira(q.total)}</span>
          </div>
          <div className="mt-2 flex justify-between text-[13.5px] text-paper/75">
            <span>Refundable deposit</span>
            <span className="num">{naira(q.deposit)}</span>
          </div>
          <div className="mt-4 flex items-baseline justify-between bg-accent px-3 py-3 text-accent-ink">
            <span className="label">Due now</span>
            <span className="num text-[20px] font-medium">{naira(q.dueNow)}</span>
          </div>
        </div>
      ) : (
        <p className="p-4 text-[14px] text-bad">Check your dates — return must be after pick-up.</p>
      )}
    </aside>
  )
}
