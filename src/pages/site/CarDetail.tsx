import { getRouteApi, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { brand } from '@/config/brand'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Check, ShieldCheck } from 'lucide-react'
import { useDb } from '@/lib/db'
import { addDays, cn, isoDate, naira } from '@/lib/utils'
import { carName } from '@/mocks/cars'
import { bookability, overlaps } from '@/services/fleet'
import { quote } from '@/lib/pricing'
import { AvailabilityCalendar } from '@/components/site/AvailabilityCalendar'
import { CarCard } from '@/components/site/CarCard'
import { GridLines, SplitHeading } from '@/components/site/Reveal'
import { Button } from '@/components/ui/button'
import { Magnetic } from '@/components/site/Magnetic'
import { NotFound } from '@/components/NotFound'

const route = getRouteApi('/site/fleet/$carId')

export default function CarDetail() {
  const { carId } = route.useParams()
  const search = route.useSearch()
  const navigate = useNavigate()
  const state = useDb((s) => s)
  const car = state.cars.find((c) => c.id === carId)
  const [img, setImg] = useState(0)
  const [start, setStart] = useState(search.start ?? isoDate(addDays(new Date(), 1)))
  const [end, setEnd] = useState(search.end ?? isoDate(addDays(new Date(), 4)))

  const info = useMemo(() => {
    if (!car) return null
    const s = new Date(start + 'T10:00:00')
    const e = new Date(end + 'T10:00:00')
    const valid = e > s
    const book = bookability(car)
    const clash = valid ? overlaps(state, car.id, s, e) : []
    const mode = car.modes.includes('self-drive') ? 'self-drive' : 'chauffeur'
    const q = valid ? quote({ car, start: s, end: e, mode, extras: [], rules: state.pricing }) : null
    return { valid, book, clash, q, mode }
  }, [car, start, end, state])

  useEffect(() => {
    if (car) document.title = `${carName(car)} in ${car.city} | ${brand.name}`
  }, [car])

  if (!car || !info) return <NotFound />
  const similar = state.cars.filter((c) => c.id !== car.id && (c.category === car.category || c.city === car.city)).slice(0, 3)
  const canBook = info.valid && info.book.ok && info.clash.length === 0

  const specs = [
    ['Year', String(car.year)],
    ['Seats', String(car.seats)],
    ['Gearbox', car.transmission],
    ['Fuel', car.fuel],
    ['Colour', car.colour],
    ['City', car.city],
    ['Drive options', car.modes.map((m) => (m === 'self-drive' ? 'Self-drive' : 'Chauffeur')).join(' or ')],
    ['Mileage', `${car.mileage.toLocaleString()} km`],
  ]

  return (
    <>
      <section className="relative overflow-hidden pt-28 md:pt-32">
        <GridLines />
        <div className="container-x relative">
          <Link to="/fleet" className="label inline-flex items-center gap-2 text-mute hover:text-paper">
            <ArrowLeft className="size-3.5" /> All cars
          </Link>
          <div className="mt-6 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
            {/* Gallery */}
            <div>
              <div className="relative aspect-[16/10] overflow-hidden bg-ink-3">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.img
                    key={car.gallery[img]}
                    src={car.gallery[img]}
                    alt={`${carName(car)} photo ${img + 1} of ${car.gallery.length}`}
                    className="absolute inset-0 h-full w-full object-cover"
                    initial={{ opacity: 0, scale: 1.04 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  />
                </AnimatePresence>
                <p className="num absolute bottom-3 right-3 bg-ink/80 px-2 py-1 text-[13px]">
                  <span className="text-accent">{img + 1}</span>/{car.gallery.length}
                </p>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-3">
                {car.gallery.map((g, i) => (
                  <button key={g + i} type="button" onClick={() => setImg(i)} aria-label={`Show photo ${i + 1}`} aria-pressed={img === i} className={cn('aspect-[4/3] overflow-hidden border-2 transition-colors', img === i ? 'border-accent' : 'border-transparent opacity-60 hover:opacity-100')}>
                    <img src={g.replace('.webp', '-sm.webp')} alt="" className="h-full w-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            </div>

            {/* Summary + booking box */}
            <div className="flex flex-col gap-6">
              <div>
                <p className="label text-mute">{car.category} / {car.city}</p>
                <SplitHeading as="h1" immediate className="display mt-3 text-[clamp(34px,4.2vw,58px)] font-extrabold uppercase tracking-[-0.04em]">
                  {carName(car)}
                </SplitHeading>
                <p className="mt-3 text-[17px] text-paper/80">{car.tagline}</p>
              </div>
              <dl className="grid grid-cols-2 border-t border-line sm:grid-cols-4 lg:grid-cols-2">
                {(['hourly', 'daily', 'weekly', 'monthly'] as const).map((k) => (
                  <div key={k} className="border-b border-line py-3 pr-3">
                    <dt className="label text-mute">{k === 'hourly' ? 'Per hour' : k === 'daily' ? 'Per day' : k === 'weekly' ? 'Per week' : 'Per month'}</dt>
                    <dd className={cn('num mt-1 text-[19px]', k === 'daily' && 'text-accent')}>{naira(car.rates[k])}</dd>
                  </div>
                ))}
              </dl>
              <p className="flex items-start gap-3 text-[15px] text-paper/80">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-accent" />
                <span>
                  Refundable deposit <span className="num font-medium text-paper">{naira(car.deposit)}</span>{car.modes.includes('chauffeur') && car.modes.length > 1 ? ' (halved with a chauffeur)' : ''}. Returned within 24 hours of a clean return.
                </span>
              </p>
              <div className="border border-line-strong bg-ink-2 p-5">
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1 border border-line bg-ink-3 px-3 py-2">
                    <span className="label !text-[9px] text-mute">Pick-up</span>
                    <input type="date" min={isoDate(new Date())} value={start} onChange={(e) => setStart(e.target.value)} className="bg-transparent text-sm font-semibold outline-none [color-scheme:dark]" />
                  </label>
                  <label className="flex flex-col gap-1 border border-line bg-ink-3 px-3 py-2">
                    <span className="label !text-[9px] text-mute">Return</span>
                    <input type="date" min={start} value={end} onChange={(e) => setEnd(e.target.value)} className="bg-transparent text-sm font-semibold outline-none [color-scheme:dark]" />
                  </label>
                </div>
                <div className="mt-4 min-h-12 text-[15px]" aria-live="polite">
                  {!info.valid ? (
                    <p className="text-bad">Return must be after pick-up.</p>
                  ) : !info.book.ok ? (
                    <p className="text-bad">Not bookable right now: {info.book.reasons.join(', ')}.</p>
                  ) : info.clash.length ? (
                    <p className="text-bad">Booked for part of those dates. Pick other dates on the calendar below.</p>
                  ) : (
                    <p className="flex items-baseline justify-between gap-4">
                      <span className="text-ok">Available · {info.q!.days} day{info.q!.days > 1 ? 's' : ''}</span>
                      <span className="num text-[22px] text-paper">{naira(info.q!.total)}</span>
                    </p>
                  )}
                </div>
                <Magnetic strength={0.15}>
                  <Button
                    size="lg"
                    roll
                    className="mt-4 w-full"
                    disabled={!canBook}
                    cursor="book"
                    icon={<ArrowRight className="size-4" />}
                    onClick={() => navigate({ to: '/book', search: { car: car.id, start, end, mode: info.mode as 'self-drive' | 'chauffeur' } })}
                  >
                    Book this car
                  </Button>
                </Magnetic>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-x grid gap-14 py-20 lg:grid-cols-[1fr_1.4fr]">
        <div className="flex flex-col gap-12">
          <div>
            <h2 className="display text-[26px] font-bold uppercase tracking-[-0.02em]">Specs</h2>
            <dl className="mt-5 border-t border-line">
              {specs.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-line py-3 text-[15px]">
                  <dt className="text-mute">{k}</dt>
                  <dd className="text-right font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
            <ul className="mt-6 flex flex-wrap gap-2">
              {car.features.map((f) => (
                <li key={f} className="label border border-line px-2.5 py-1.5">{f}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="display text-[26px] font-bold uppercase tracking-[-0.02em]">What you need</h2>
            <ul className="mt-5 flex flex-col gap-3 text-[15px] text-paper/85">
              {[
                car.modes.includes('self-drive') ? `Driver aged ${state.settings.minAge}+ with a full licence (2+ years)` : 'Chauffeur included — no licence needed',
                'NIN (or passport for visitors) and a quick live selfie',
                'Signed digital rental agreement',
                `Refundable deposit of ${naira(car.deposit)}`,
                'Interstate travel needs a permit (add it at booking)',
              ].map((r) => (
                <li key={r} className="flex gap-3">
                  <Check className="mt-0.5 size-4 shrink-0 text-accent" /> {r}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div>
          <h2 className="display text-[26px] font-bold uppercase tracking-[-0.02em]">Availability</h2>
          <p className="mt-2 text-[15px] text-mute">Tap a start and end day to pick your dates.</p>
          <div className="mt-6">
            <AvailabilityCalendar
              state={state}
              carId={car.id}
              start={start}
              end={end}
              onSelect={(a, b) => {
                setStart(a)
                setEnd(b)
              }}
            />
          </div>
        </div>
      </section>

      {similar.length ? (
        <section className="border-t border-line py-20">
          <div className="container-x">
            <h2 className="display text-[clamp(28px,3.4vw,44px)] font-extrabold uppercase tracking-[-0.03em]">You might also like</h2>
            <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {similar.map((c) => (
                <li key={c.id}>
                  <CarCard car={c} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </>
  )
}
