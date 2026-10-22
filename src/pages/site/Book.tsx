import { getRouteApi, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarPlus, Check, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { brand } from '@/config/brand'
import { db, setSession, useDb } from '@/lib/db'
import { quote } from '@/lib/pricing'
import { scrollToTop } from '@/lib/smooth'
import { addDays, cn, fmtDay, fmtTime, isoDate, naira, waLink } from '@/lib/utils'
import { carName } from '@/mocks/cars'
import { locationName, locations } from '@/mocks/locations'
import type { Customer } from '@/mocks/types'
import { bookingService, BookingConflictError } from '@/services/bookings'
import { notificationService } from '@/services/notifications'
import { WhatsAppGlyph } from '@/components/site/SocialIcons'
import { GridLines } from '@/components/site/Reveal'
import { Button } from '@/components/ui/button'
import { Summary } from '@/components/booking/Summary'
import { StepAgreement, StepExtras, StepTrip, StepVerify } from '@/components/booking/Steps'
import { PaymentStep } from '@/components/booking/Checkout'
import { endOf, startOf, STEPS, type Draft } from '@/components/booking/types'

const route = getRouteApi('/site/book')
const KEY = 'rentalos:booking-draft'

function initialDraft(search: ReturnType<typeof route.useSearch>): Draft {
  const car = search.car ? db.get().cars.find((c) => c.id === search.car) : undefined
  const city = car?.city ?? (search.city && (brand.cities as readonly string[]).includes(search.city) ? search.city : brand.cities[0])
  const office = locations.find((l) => l.city === city && l.kind === 'office')!.id
  return {
    carId: car?.id,
    city,
    startDate: search.start ?? isoDate(addDays(new Date(), 1)),
    startTime: '10:00',
    endDate: search.end ?? isoDate(addDays(new Date(), 4)),
    endTime: '10:00',
    pickup: office,
    dropoff: office,
    flight: '',
    mode: search.mode && (!car || car.modes.includes(search.mode)) ? search.mode : car?.modes[0] ?? 'self-drive',
    extras: [],
    promo: '',
    name: '',
    phone: '',
    email: '',
  }
}

export default function Book() {
  const search = route.useSearch()
  const state = useDb((s) => s)
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<Draft>(() => {
    // Resume an unfinished draft only when no new car/dates were passed in.
    try {
      const saved = sessionStorage.getItem(KEY)
      if (saved && !search.car && !search.start) {
        const d = JSON.parse(saved) as Draft
        if (!d.bookingRef) return d
      }
    } catch {
      /* ignore */
    }
    return initialDraft(search)
  })
  const top = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const { signature: _sig, ...rest } = draft
      void _sig
      sessionStorage.setItem(KEY, JSON.stringify(rest))
    } catch {
      /* ignore */
    }
  }, [draft])

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))
  const car = state.cars.find((c) => c.id === draft.carId)
  const q = useMemo(() => {
    if (!car) return null
    const s = startOf(draft)
    const e = endOf(draft)
    if (isNaN(+s) || isNaN(+e) || e <= s) return null
    return quote({ car, start: s, end: e, mode: draft.mode, extras: draft.extras, promo: draft.promo, rules: state.pricing })
  }, [car, draft, state.pricing])

  const go = (n: number) => {
    setDir(n > step ? 1 : -1)
    setStep(n)
    scrollToTop(false)
  }

  const onPaid = async (method: string) => {
    if (!car || !q) return
    setSaving(true)
    try {
      // Find or create the customer record (only results are stored, never the NIN/selfie).
      const s = db.get()
      let customer = s.customers.find((c) => c.email.toLowerCase() === draft.email.toLowerCase() || c.phone.replace(/\s/g, '') === draft.phone.replace(/\s/g, ''))
      if (customer?.blacklist) {
        toast.error(`We can’t complete this booking online. Please call ${brand.contact.phoneDisplay} — you haven’t been charged.`)
        return
      }
      const verification = draft.skipVerification ? 'verified' : [draft.nin, draft.licence, draft.selfie].includes('review') ? 'review' : 'verified'
      if (!customer) {
        customer = {
          id: `c-${Date.now()}`,
          name: draft.name,
          phone: draft.phone,
          email: draft.email,
          city: draft.city as Customer['city'],
          verification,
          verificationDetail: { nin: draft.nin === 'verified' ? 'match' : 'pending', licence: draft.licence === 'verified' || draft.mode === 'chauffeur' ? 'valid' : 'pending', selfie: draft.selfieScore ?? 92 },
          risk: 'low',
          riskFlags: [],
          notes: [],
          joined: new Date().toISOString(),
          referralCode: `${draft.name.split(' ')[0].toUpperCase().slice(0, 5)}${Math.floor(Math.random() * 90 + 10)}`,
          points: 0,
        }
        const created = customer
        db.set((d) => {
          d.customers.unshift(created)
        })
      }
      const booking = await bookingService.create({
        carId: car.id,
        customerId: customer.id,
        start: startOf(draft).toISOString(),
        end: endOf(draft).toISOString(),
        pickup: draft.pickup,
        dropoff: draft.dropoff,
        mode: draft.mode,
        extras: draft.extras,
        status: verification === 'review' ? 'pending' : 'confirmed',
        total: q.total,
        paid: q.total,
        deposit: q.deposit,
        depositStatus: 'held',
        channel: 'website',
        promo: q.promoValid ? draft.promo : undefined,
      })
      if (q.promoValid) {
        db.set((d) => {
          const p = d.pricing.promos.find((x) => x.code === draft.promo)
          if (p) p.uses++
        })
      }
      setSession({ customerId: customer.id })
      notificationService.send(draft.phone, 'whatsapp', 'booking_confirmed', `Booking ${booking.ref} confirmed`)
      set({ bookingId: booking.id, bookingRef: booking.ref, paidWith: method })
      sessionStorage.removeItem(KEY)
      toast.success(`Booking ${booking.ref} confirmed`)
      go(5)
    } catch (e) {
      if (e instanceof BookingConflictError) {
        toast.error('Someone just booked this car for those dates. Pick another car — you haven’t been charged.')
        go(0)
      } else toast.error('Something went wrong saving your booking. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const props = { draft, set, state, car, next: () => go(step + 1), back: () => go(step - 1) }

  return (
    <section className="relative min-h-dvh pt-28 pb-24 md:pt-32" ref={top}>
      <GridLines />
      <div className="container-x relative">
        <h1 className="display text-[clamp(36px,5.4vw,76px)] font-extrabold uppercase tracking-[-0.04em]">{step === 5 ? 'You’re booked' : 'Book a car'}</h1>
        {/* Progress */}
        <ol className="mt-8 grid grid-cols-6 gap-1.5" aria-label="Booking progress">
          {STEPS.map((label, i) => (
            <li key={label} aria-current={i === step ? 'step' : undefined}>
              <div className="h-1 bg-line">
                <div className={cn('h-full origin-left bg-accent transition-transform duration-500 [transition-timing-function:var(--ease-out-expo)]', i <= step ? 'scale-x-100' : 'scale-x-0')} />
              </div>
              <p className={cn('label mt-2 hidden !text-[9.5px] sm:block', i === step ? 'text-paper' : i < step ? 'text-accent' : 'text-mute')}>
                {i < step ? <Check className="mr-1 inline size-3" /> : null}
                {label}
              </p>
            </li>
          ))}
        </ol>
        <p className="label mt-3 text-mute sm:hidden">
          Step {step + 1} of {STEPS.length}: <span className="text-paper">{STEPS[step]}</span>
        </p>

        <div className={cn('mt-12 grid gap-10', step < 5 && 'lg:grid-cols-[1fr_380px]')}>
          <div className="min-w-0">
            <AnimatePresence mode="wait" custom={dir} initial={false}>
              <motion.div
                key={step}
                custom={dir}
                initial={{ opacity: 0, x: dir * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir * -40 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              >
                {step === 0 && <StepTrip {...props} />}
                {step === 1 && <StepExtras {...props} />}
                {step === 2 && <StepVerify {...props} />}
                {step === 3 && <StepAgreement {...props} />}
                {step === 4 && q && (
                  <div className={cn(saving && 'pointer-events-none opacity-60')}>
                    <PaymentStep amount={q.total} deposit={q.deposit} email={draft.email} onPaid={onPaid} back={props.back} />
                  </div>
                )}
                {step === 5 && <Confirmation draft={draft} />}
              </motion.div>
            </AnimatePresence>
          </div>
          {step < 5 && (
            <div className="lg:sticky lg:top-24 lg:self-start">
              <Summary car={car} draft={draft} q={q} />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function Confirmation({ draft }: { draft: Draft }) {
  const booking = useDb((s) => s.bookings.find((b) => b.id === draft.bookingId))
  const car = useDb((s) => s.cars.find((c) => c.id === booking?.carId))
  if (!booking || !car) return null
  const s = new Date(booking.start)
  const e = new Date(booking.end)
  const msg = `Hi ${brand.shortName}, this is ${draft.name}. My booking ref is ${booking.ref}: ${carName(car)}, pick-up ${fmtDay(s)} ${fmtTime(s)} at ${locationName(booking.pickup)}.`
  const ics = `data:text/calendar;charset=utf-8,${encodeURIComponent(
    `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:${carName(car)} pick-up (${booking.ref})\nDTSTART:${s.toISOString().replace(/[-:]/g, '').split('.')[0]}Z\nDTEND:${e.toISOString().replace(/[-:]/g, '').split('.')[0]}Z\nLOCATION:${locationName(booking.pickup)}\nEND:VEVENT\nEND:VCALENDAR`,
  )}`
  return (
    <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
      <div>
        <div className="border border-line-strong bg-ink-2">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line p-5">
            <div>
              <p className="label text-mute">Booking reference</p>
              <p className="num mt-1 text-[32px] text-accent">{booking.ref}</p>
            </div>
            <span className={cn('label px-3 py-1.5', booking.status === 'confirmed' ? 'bg-ok text-ink' : 'bg-warn text-ink')}>{booking.status === 'confirmed' ? 'Confirmed' : 'Confirmed — ID under review'}</span>
          </div>
          <dl className="grid gap-5 p-5 sm:grid-cols-2">
            <div>
              <dt className="label text-mute">Car</dt>
              <dd className="mt-1 font-semibold">{carName(car)}</dd>
              <dd className="text-[14px] text-mute">{car.colour} · {car.plate}</dd>
            </div>
            <div>
              <dt className="label text-mute">Paid</dt>
              <dd className="num mt-1 font-semibold">{naira(booking.paid + booking.deposit)}</dd>
              <dd className="text-[14px] text-mute">incl. {naira(booking.deposit)} refundable deposit · {draft.paidWith}</dd>
            </div>
            <div>
              <dt className="label text-mute">Pick-up</dt>
              <dd className="mt-1 font-semibold">{fmtDay(s)}, {fmtTime(s)}</dd>
              <dd className="flex items-start gap-1.5 text-[14px] text-mute"><MapPin className="mt-0.5 size-3.5 shrink-0" />{locationName(booking.pickup)}</dd>
            </div>
            <div>
              <dt className="label text-mute">Return</dt>
              <dd className="mt-1 font-semibold">{fmtDay(e)}, {fmtTime(e)}</dd>
              <dd className="flex items-start gap-1.5 text-[14px] text-mute"><MapPin className="mt-0.5 size-3.5 shrink-0" />{locationName(booking.dropoff)}</dd>
            </div>
          </dl>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild size="lg" icon={<WhatsAppGlyph className="size-4" />}>
            <a href={waLink(msg)} target="_blank" rel="noreferrer">Add to WhatsApp</a>
          </Button>
          <Button asChild size="lg" variant="ghost" icon={<CalendarPlus className="size-4" />}>
            <a href={ics} download={`${booking.ref}.ics`}>Add to calendar</a>
          </Button>
          <Button asChild size="lg" variant="ghost" roll>
            <Link to="/account">View my trips</Link>
          </Button>
        </div>
      </div>
      <div>
        <h2 className="display text-[22px] font-bold uppercase">What happens next</h2>
        <ol className="mt-5 flex flex-col gap-5 border-l border-line pl-5 text-[15px]">
          <li><span className="font-semibold">Now:</span> <span className="text-paper/75">Confirmation and your agreement copy go to {draft.email} and WhatsApp.</span></li>
          <li><span className="font-semibold">2 hours before:</span> <span className="text-paper/75">We send the {draft.mode === 'chauffeur' ? 'chauffeur’s name and number' : 'exact handover spot'} and a reminder.</span></li>
          <li><span className="font-semibold">At pick-up:</span> <span className="text-paper/75">A quick photo walkaround with you — that’s your protection on return.</span></li>
          <li><span className="font-semibold">After return:</span> <span className="text-paper/75">Deposit back within 24 hours, with photos if anything is deducted.</span></li>
        </ol>
      </div>
    </div>
  )
}
