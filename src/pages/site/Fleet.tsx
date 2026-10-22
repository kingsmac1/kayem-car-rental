import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import { brand } from '@/config/brand'
import { useDb } from '@/lib/db'
import { addDays, cn, isoDate, naira } from '@/lib/utils'
import { bookability, overlaps } from '@/services/fleet'
import type { CarCategory } from '@/mocks/types'
import { CarCard } from '@/components/site/CarCard'
import { PageHeader } from '@/components/site/PageHeader'
import { EmptyState } from '@/components/ui/misc'
import { Button } from '@/components/ui/button'

const route = getRouteApi('/site/fleet')

const TYPES: { id: string; label: string; match: (c: CarCategory) => boolean }[] = [
  { id: 'all', label: 'All', match: () => true },
  { id: 'Saloon', label: 'Saloons', match: (c) => c === 'Saloon' },
  { id: 'SUV', label: 'SUVs', match: (c) => c === 'SUV' },
  { id: 'Luxury', label: 'Luxury', match: (c) => c.startsWith('Luxury') },
  { id: 'Van', label: 'Vans & buses', match: (c) => c === 'Van' || c === 'Bus' },
]
const PRICE_STEPS = [50000, 100000, 200000, 300000, 450000]

export default function Fleet() {
  const search = route.useSearch()
  const navigate = useNavigate({ from: '/fleet' })
  const state = useDb((s) => s)
  const [price, setPrice] = useState(450000)
  const [seats, setSeats] = useState(0)
  const [trans, setTrans] = useState<'any' | 'Automatic' | 'Manual'>('any')
  const [onlyFree, setOnlyFree] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const city = search.city ?? 'all'
  const type = search.type ?? 'all'
  const mode = search.mode ?? 'any'
  const start = search.start
  const end = search.end

  const setSearch = (patch: Record<string, string | undefined>) => navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true, resetScroll: false })

  const results = useMemo(() => {
    const s = start ? new Date(start + 'T10:00:00') : undefined
    const e = end ? new Date(end + 'T10:00:00') : undefined
    const datesValid = s && e && e > s
    return state.cars
      .filter((c) => city === 'all' || c.city === city)
      .filter((c) => (TYPES.find((t) => t.id === type) ?? TYPES[0]).match(c.category))
      .filter((c) => c.rates.daily <= price)
      .filter((c) => c.seats >= seats)
      .filter((c) => trans === 'any' || c.transmission === trans)
      .filter((c) => mode === 'any' || c.modes.includes(mode as 'self-drive' | 'chauffeur'))
      .map((c) => {
        const ok = bookability(c).ok
        const free = ok && (datesValid ? overlaps(state, c.id, s!, e!).length === 0 : c.status === 'available')
        return { car: c, free }
      })
      .filter((r) => !onlyFree || r.free)
      .sort((a, b) => Number(b.free) - Number(a.free) || a.car.rates.daily - b.car.rates.daily)
  }, [state, city, type, price, seats, trans, mode, start, end, onlyFree])

  const freeCount = results.filter((r) => r.free).length
  const today = isoDate(new Date())

  const chip = (active: boolean) => cn('label h-9 border px-3 transition-colors', active ? 'border-accent bg-accent text-accent-ink' : 'border-line text-paper hover:border-line-strong')

  const filters = (
    <div className="flex flex-col gap-7">
      <fieldset>
        <legend className="label mb-3 text-mute">Dates</legend>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 border border-line bg-ink-3 px-3 py-2">
            <span className="label !text-[9px] text-mute">Pick-up</span>
            <input type="date" min={today} value={start ?? ''} onChange={(e) => setSearch({ start: e.target.value || undefined, end: end && e.target.value && end <= e.target.value ? isoDate(addDays(e.target.value, 2)) : end })} className="bg-transparent text-sm font-semibold outline-none [color-scheme:dark]" />
          </label>
          <label className="flex flex-col gap-1 border border-line bg-ink-3 px-3 py-2">
            <span className="label !text-[9px] text-mute">Return</span>
            <input type="date" min={start ?? today} value={end ?? ''} onChange={(e) => setSearch({ end: e.target.value || undefined })} className="bg-transparent text-sm font-semibold outline-none [color-scheme:dark]" />
          </label>
        </div>
        {start && end && end <= start ? <p className="mt-2 text-[13px] text-bad">Return must be after pick-up.</p> : null}
      </fieldset>
      <fieldset>
        <legend className="label mb-3 text-mute">City</legend>
        <div className="flex flex-wrap gap-2">
          {['all', ...brand.cities].map((c) => (
            <button key={c} type="button" aria-pressed={city === c} className={chip(city === c)} onClick={() => setSearch({ city: c === 'all' ? undefined : c })}>
              {c === 'all' ? 'All cities' : c}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="label mb-3 text-mute">Car type</legend>
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <button key={t.id} type="button" aria-pressed={type === t.id} className={chip(type === t.id)} onClick={() => setSearch({ type: t.id === 'all' ? undefined : t.id })}>
              {t.label}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="label mb-3 text-mute">Drive</legend>
        <div className="flex flex-wrap gap-2">
          {[['any', 'Any'], ['self-drive', 'Self-drive'], ['chauffeur', 'Chauffeur']].map(([id, label]) => (
            <button key={id} type="button" aria-pressed={mode === id} className={chip(mode === id)} onClick={() => setSearch({ mode: id === 'any' ? undefined : id })}>
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="label mb-3 flex w-full justify-between text-mute">
          <span>Max price / day</span>
          <span className="num text-accent normal-case tracking-normal">{price >= 450000 ? 'Any' : naira(price)}</span>
        </legend>
        <input type="range" min={0} max={PRICE_STEPS.length - 1} step={1} value={PRICE_STEPS.indexOf(price)} onChange={(e) => setPrice(PRICE_STEPS[Number(e.target.value)])} className="w-full accent-[var(--brand-accent)]" aria-label="Maximum daily price" />
      </fieldset>
      <fieldset>
        <legend className="label mb-3 text-mute">Seats</legend>
        <div className="flex flex-wrap gap-2">
          {[0, 5, 7, 14].map((n) => (
            <button key={n} type="button" aria-pressed={seats === n} className={chip(seats === n)} onClick={() => setSeats(n)}>
              {n === 0 ? 'Any' : `${n}+`}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="label mb-3 text-mute">Transmission</legend>
        <div className="flex flex-wrap gap-2">
          {(['any', 'Automatic', 'Manual'] as const).map((t) => (
            <button key={t} type="button" aria-pressed={trans === t} className={chip(trans === t)} onClick={() => setTrans(t)}>
              {t === 'any' ? 'Any' : t}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="flex cursor-pointer items-center gap-3 text-[15px]">
        <input type="checkbox" checked={onlyFree} onChange={(e) => setOnlyFree(e.target.checked)} className="size-4 accent-[var(--brand-accent)]" />
        Only show available cars
      </label>
    </div>
  )

  return (
    <>
      <PageHeader title="The fleet" intro={<>Filter by city, type and dates — availability updates live. Every car is tracked, insured and inspected between trips.</>} />
      <section className="container-x grid gap-10 py-14 lg:grid-cols-[300px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24">{filters}</div>
        </aside>
        <div>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
            <p className="text-[15px]" aria-live="polite">
              <span className="num text-accent">{freeCount}</span> of <span className="num">{results.length}</span> cars available
              {start && end ? <span className="text-mute"> for {start} → {end}</span> : <span className="text-mute"> today</span>}
            </p>
            <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setFiltersOpen(true)} icon={<SlidersHorizontal className="size-3.5" />}>
              Filters
            </Button>
          </div>
          {results.length ? (
            <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {results.map(({ car, free }, i) => (
                <li key={car.id}>
                  <CarCard car={car} available={free} eager={i < 3} search={{ start, end }} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="No cars match those filters"
              body="Try another city, widen the price range or change your dates. Or ask the concierge — new cars free up every day."
              action={
                <Button variant="ghost" size="sm" onClick={() => { setPrice(450000); setSeats(0); setTrans('any'); setOnlyFree(false); navigate({ search: {} }) }}>
                  Clear filters
                </Button>
              }
            />
          )}
        </div>
      </section>
      {filtersOpen && (
        <div className="fixed inset-0 z-[80] bg-ink/95 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters" data-lenis-prevent>
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-line px-[var(--gutter)] py-4">
              <p className="label">Filters</p>
              <button type="button" onClick={() => setFiltersOpen(false)} aria-label="Close filters" className="grid size-10 place-items-center">
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-[var(--gutter)] py-6">{filters}</div>
            <div className="border-t border-line p-[var(--gutter)]">
              <Button className="w-full" size="lg" onClick={() => setFiltersOpen(false)}>
                Show {results.length} cars
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
