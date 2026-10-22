import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, Check, CheckCircle2, Clock, FileImage, Loader2, ShieldCheck, XCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { brand } from '@/config/brand'
import type { Car, DemoState } from '@/mocks/types'
import { carName } from '@/mocks/cars'
import { locations, locationName } from '@/mocks/locations'
import { EXTRAS, CHAUFFEUR_DAY } from '@/lib/pricing'
import { cn, fmtDay, fmtTime, isoDate, naira } from '@/lib/utils'
import { bookability, overlaps } from '@/services/fleet'
import { verificationService, type CheckResult } from '@/services/verification'
import { sm } from '@/data/images'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/input'
import { SelfieCapture } from './SelfieCapture'
import { SignaturePad } from './SignaturePad'
import { endOf, startOf, type Draft } from './types'

type StepProps = { draft: Draft; set: (patch: Partial<Draft>) => void; next: () => void; back?: () => void; state: DemoState; car?: Car }

const TIMES = Array.from({ length: 31 }, (_, i) => {
  const h = 6 + Math.floor(i / 2)
  return `${String(h).padStart(2, '0')}:${i % 2 ? '30' : '00'}`
})

function StepNav({ back, nextLabel = 'Continue', disabled, loading, onNext, type = 'button' }: { back?: () => void; nextLabel?: string; disabled?: boolean; loading?: boolean; onNext?: () => void; type?: 'button' | 'submit' }) {
  return (
    <div className="mt-10 flex items-center justify-between gap-4 border-t border-line pt-6">
      {back ? (
        <Button type="button" variant="ghost" onClick={back} roll>
          Back
        </Button>
      ) : (
        <span />
      )}
      <Button type={type} onClick={onNext} disabled={disabled} loading={loading} roll size="lg">
        {nextLabel}
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------- 1. Trip
export function StepTrip({ draft, set, next, state, car }: StepProps) {
  const [touched, setTouched] = useState(false)
  const cityLocs = locations.filter((l) => l.city === draft.city)
  const s = startOf(draft)
  const e = endOf(draft)
  const datesOk = !isNaN(+s) && !isNaN(+e) && e > s && s > new Date(Date.now() - 3600_000)
  const candidates = useMemo(
    () =>
      state.cars
        .filter((c) => c.city === draft.city && bookability(c).ok)
        .map((c) => ({ c, free: datesOk && overlaps(state, c.id, s, e).length === 0 }))
        .sort((a, b) => Number(b.free) - Number(a.free) || a.c.rates.daily - b.c.rates.daily),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, draft.city, draft.startDate, draft.startTime, draft.endDate, draft.endTime],
  )
  const carFree = car && datesOk && bookability(car).ok && overlaps(state, car.id, s, e).length === 0
  const airportPick = locations.find((l) => l.id === draft.pickup)?.kind === 'airport'

  const errors = {
    dates: !datesOk ? 'Return must be after pick-up, and pick-up can’t be in the past.' : '',
    car: !car ? 'Choose a car.' : !carFree ? 'This car isn’t free for those dates — choose another or change dates.' : '',
    pickup: !draft.pickup ? 'Choose a pick-up point.' : '',
    dropoff: !draft.dropoff ? 'Choose a return point.' : '',
  }
  const valid = Object.values(errors).every((x) => !x)

  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault()
        setTouched(true)
        if (valid) next()
      }}
      noValidate
    >
      <h2 className="display text-[clamp(26px,3vw,38px)] font-bold uppercase tracking-[-0.02em]">Your trip</h2>
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <Field label="City" htmlFor="city" className="sm:col-span-2">
          <div className="flex flex-wrap gap-2" id="city" role="radiogroup">
            {brand.cities.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={draft.city === c}
                onClick={() => {
                  const office = locations.find((l) => l.city === c && l.kind === 'office')!.id
                  set({ city: c, carId: car?.city === c ? draft.carId : undefined, pickup: office, dropoff: office })
                }}
                className={cn('label h-11 border px-4', draft.city === c ? 'border-accent bg-accent text-accent-ink' : 'border-line hover:border-line-strong')}
              >
                {c}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Pick-up date" htmlFor="sd">
          <div className="grid grid-cols-[1.4fr_1fr] gap-2">
            <Input id="sd" type="date" min={isoDate(new Date())} value={draft.startDate} onChange={(ev) => set({ startDate: ev.target.value })} className="[color-scheme:dark]" />
            <Select aria-label="Pick-up time" value={draft.startTime} onChange={(ev) => set({ startTime: ev.target.value })}>
              {TIMES.map((t) => <option key={t}>{t}</option>)}
            </Select>
          </div>
        </Field>
        <Field label="Return date" htmlFor="ed" error={touched ? errors.dates : undefined}>
          <div className="grid grid-cols-[1.4fr_1fr] gap-2">
            <Input id="ed" type="date" min={draft.startDate} value={draft.endDate} onChange={(ev) => set({ endDate: ev.target.value })} className="[color-scheme:dark]" aria-invalid={touched && !!errors.dates} />
            <Select aria-label="Return time" value={draft.endTime} onChange={(ev) => set({ endTime: ev.target.value })}>
              {TIMES.map((t) => <option key={t}>{t}</option>)}
            </Select>
          </div>
        </Field>
        <Field label="Pick-up point" htmlFor="pu" error={touched ? errors.pickup : undefined}>
          <Select id="pu" value={draft.pickup} onChange={(ev) => set({ pickup: ev.target.value, dropoff: draft.dropoff || ev.target.value })}>
            {cityLocs.map((l) => (
              <option key={l.id} value={l.id}>{l.kind === 'airport' ? '✈ ' : ''}{l.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Return point" htmlFor="do" error={touched ? errors.dropoff : undefined}>
          <Select id="do" value={draft.dropoff} onChange={(ev) => set({ dropoff: ev.target.value })}>
            {cityLocs.map((l) => (
              <option key={l.id} value={l.id}>{l.kind === 'airport' ? '✈ ' : ''}{l.name}</option>
            ))}
          </Select>
        </Field>
        {airportPick && (
          <Field label="Flight number (optional)" htmlFor="fl" hint="We track your flight and wait if you land late." className="sm:col-span-2">
            <Input id="fl" placeholder="e.g. BA75, P47131" value={draft.flight} onChange={(ev) => set({ flight: ev.target.value.toUpperCase() })} />
          </Field>
        )}
      </div>

      <div className="mt-10">
        <p className="label text-mute">Car</p>
        {touched && errors.car ? <p role="alert" className="mt-2 text-[13px] text-bad">{errors.car}</p> : null}
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {candidates.map(({ c, free }) => (
            <li key={c.id}>
              <button
                type="button"
                disabled={!free}
                onClick={() => set({ carId: c.id, mode: c.modes.includes(draft.mode) ? draft.mode : c.modes[0] })}
                aria-pressed={draft.carId === c.id}
                className={cn('flex w-full items-center gap-4 border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40', draft.carId === c.id ? 'border-accent bg-accent/8' : 'border-line hover:border-line-strong')}
              >
                <img src={sm(c.image)} alt="" className="aspect-[4/3] w-20 object-cover" loading="lazy" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{carName(c)}</span>
                  <span className="num text-[13px] text-mute">{naira(c.rates.daily)}/day · {c.seats} seats</span>
                </span>
                {draft.carId === c.id ? <Check className="size-5 shrink-0 text-accent" /> : !free ? <span className="label shrink-0 !text-[9px] text-bad">Booked</span> : null}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <StepNav type="submit" />
    </form>
  )
}

// ---------------------------------------------------------------- 2. Drive & extras
export function StepExtras({ draft, set, next, back, car, state }: StepProps) {
  if (!car) return null
  const days = Math.max(1, Math.ceil((+endOf(draft) - +startOf(draft) - 3600_000) / 86_400_000))
  const promo = draft.promo.trim()
  const promoValid = promo ? state.pricing.promos.some((p) => p.code === promo.toUpperCase() && p.active && p.uses < p.limit && new Date(p.expires) > new Date()) : null
  return (
    <div>
      <h2 className="display text-[clamp(26px,3vw,38px)] font-bold uppercase tracking-[-0.02em]">Drive & extras</h2>
      <fieldset className="mt-8">
        <legend className="label mb-3 text-mute">How do you want to travel?</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {(['self-drive', 'chauffeur'] as const).map((m) => {
            const allowed = car.modes.includes(m)
            return (
              <button
                key={m}
                type="button"
                disabled={!allowed}
                onClick={() => set({ mode: m })}
                aria-pressed={draft.mode === m}
                className={cn('border p-5 text-left transition-colors disabled:opacity-40', draft.mode === m ? 'border-accent bg-accent/8' : 'border-line hover:border-line-strong')}
              >
                <span className="flex items-center justify-between">
                  <span className="font-display text-[18px] font-bold">{m === 'self-drive' ? 'Self-drive' : 'With chauffeur'}</span>
                  {draft.mode === m && <Check className="size-5 text-accent" />}
                </span>
                <span className="mt-2 block text-[14px] text-mute">
                  {m === 'self-drive' ? (allowed ? 'You drive. Licence check required.' : 'This car is chauffeur-only.') : `Vetted, uniformed driver. +${naira(CHAUFFEUR_DAY)}/day, deposit halved.`}
                </span>
              </button>
            )
          })}
        </div>
      </fieldset>
      <fieldset className="mt-10">
        <legend className="label mb-3 text-mute">Extras</legend>
        <ul className="border-t border-line">
          {EXTRAS.map((x) => {
            const on = draft.extras.includes(x.id)
            return (
              <li key={x.id} className="border-b border-line">
                <label className="flex cursor-pointer items-center gap-4 py-4">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => set({ extras: on ? draft.extras.filter((e) => e !== x.id) : [...draft.extras, x.id] })}
                    className="size-5 accent-[var(--brand-accent)]"
                  />
                  <span className="flex-1">
                    <span className="block font-semibold">{x.id}</span>
                    <span className="text-[13.5px] text-mute">{x.note}</span>
                  </span>
                  <span className="num text-right text-[14px]">
                    {naira(x.per === 'day' ? x.price * days : x.price)}
                    <span className="block text-[12px] text-mute">{x.per === 'day' ? `${naira(x.price)}/day` : 'per trip'}</span>
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      </fieldset>
      <div className="mt-10 max-w-sm">
        <Field label="Promo code" htmlFor="promo" error={promo && promoValid === false ? 'That code isn’t valid or has expired.' : undefined} hint={promoValid ? 'Code applied ✓' : 'Try WELCOME10'}>
          <Input id="promo" value={draft.promo} onChange={(e) => set({ promo: e.target.value.toUpperCase() })} placeholder="Enter code" autoComplete="off" />
        </Field>
      </div>
      <StepNav back={back} onNext={next} />
    </div>
  )
}

// ---------------------------------------------------------------- 3. Verify
const contactSchema = z.object({
  name: z.string().trim().min(3, 'Enter your full name as on your ID.').refine((v) => v.includes(' '), 'Enter first and last name.'),
  phone: z
    .string()
    .trim()
    .regex(/^(\+?234|0)[789][01]\d{8}$/, 'Enter a Nigerian mobile number, e.g. 0803 123 4567.')
    .or(z.string().regex(/^\+\d{8,15}$/, 'Enter a valid phone number.')),
  email: z.string().trim().email('Enter a valid email address.'),
})
type Contact = z.infer<typeof contactSchema>

function StatusRow({ label, status, detail, busy }: { label: string; status?: CheckResult; detail?: string; busy?: boolean }) {
  const map = {
    verified: { icon: <CheckCircle2 className="size-5 text-ok" />, text: 'Verified', cls: 'text-ok' },
    failed: { icon: <XCircle className="size-5 text-bad" />, text: 'Failed', cls: 'text-bad' },
    review: { icon: <Clock className="size-5 text-warn" />, text: 'Under review', cls: 'text-warn' },
  }
  const m = status ? map[status] : null
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="font-semibold">{label}</span>
      <span className={cn('flex items-center gap-2 text-[14px]', m?.cls ?? 'text-mute')}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : m?.icon}
        {busy ? 'Checking…' : m?.text ?? 'Not started'}
        {detail && !busy ? <span className="sr-only">{detail}</span> : null}
      </span>
    </div>
  )
}

export function StepVerify({ draft, set, next, back, state }: StepProps) {
  const knownCustomer = useMemo(() => {
    const key = (draft.email || draft.phone).toLowerCase()
    if (!key) return undefined
    return state.customers.find((c) => (c.email.toLowerCase() === draft.email.toLowerCase() || c.phone.replace(/\s/g, '') === draft.phone.replace(/\s/g, '')) && c.verification === 'verified')
  }, [draft.email, draft.phone, state.customers])
  const returning = draft.skipVerification || !!knownCustomer || (draft.email ? verificationService.isKnownVerified(draft.email) : false)

  const { register, handleSubmit, formState, getValues } = useForm<Contact>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: draft.name, phone: draft.phone, email: draft.email },
    mode: 'onBlur',
  })
  const [contactSaved, setContactSaved] = useState(!!draft.name && !!draft.email)
  const [nin, setNin] = useState('')
  const [ninMsg, setNinMsg] = useState('')
  const [busy, setBusy] = useState<'nin' | 'licence' | 'selfie' | null>(null)
  const [licenceFile, setLicenceFile] = useState<File | null>(null)
  const [licenceMsg, setLicenceMsg] = useState('')
  const [selfieMsg, setSelfieMsg] = useState('')
  const needsLicence = draft.mode === 'self-drive'

  const saveContact = handleSubmit((v) => {
    set({ name: v.name, phone: v.phone, email: v.email })
    setContactSaved(true)
  })

  const checkNin = async () => {
    setBusy('nin')
    const r = await verificationService.verifyNIN(nin)
    setBusy(null)
    setNinMsg(r.message)
    set({ nin: r.status })
    setNin('') // never keep the NIN once checked
  }
  const checkLicence = async (f: File | null) => {
    setLicenceFile(f)
    setBusy('licence')
    const r = await verificationService.verifyLicence(f)
    setBusy(null)
    setLicenceMsg(r.message)
    set({ licence: r.status })
  }
  const checkSelfie = async (source: 'camera' | 'upload') => {
    setBusy('selfie')
    const r = await verificationService.verifySelfie(source)
    setBusy(null)
    setSelfieMsg(r.message)
    set({ selfie: r.status, selfieScore: r.score })
  }

  const results = [draft.nin, needsLicence ? draft.licence : 'verified', draft.selfie]
  const anyFailed = results.includes('failed')
  const allDone = results.every((r) => r === 'verified' || r === 'review')
  const overall: CheckResult | undefined = anyFailed ? 'failed' : allDone ? (results.includes('review') ? 'review' : 'verified') : undefined

  return (
    <div>
      <h2 className="display text-[clamp(26px,3vw,38px)] font-bold uppercase tracking-[-0.02em]">Verify your identity</h2>
      <p className="mt-3 max-w-xl text-[15px] text-paper/75">A one-time check that keeps our cars — and you — safe. We keep only the result, never your NIN or selfie.</p>

      {/* Contact */}
      <form onSubmit={saveContact} className="mt-8 grid gap-4 sm:grid-cols-3" noValidate>
        <Field label="Full name" htmlFor="name" error={formState.errors.name?.message}>
          <Input id="name" autoComplete="name" {...register('name')} aria-invalid={!!formState.errors.name} />
        </Field>
        <Field label="Phone (WhatsApp)" htmlFor="phone" error={formState.errors.phone?.message}>
          <Input id="phone" type="tel" autoComplete="tel" placeholder="0803 123 4567" {...register('phone', { setValueAs: (v: string) => v.replace(/\s/g, '') })} aria-invalid={!!formState.errors.phone} />
        </Field>
        <Field label="Email" htmlFor="email" error={formState.errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" {...register('email')} aria-invalid={!!formState.errors.email} />
        </Field>
        <div className="sm:col-span-3">
          <Button type="submit" variant={contactSaved ? 'ghost' : 'primary'} size="sm">
            {contactSaved ? 'Update details' : 'Save details'}
          </Button>
          <span className="ml-3 text-[13px] text-mute">Tip: use chiamaka.okonkwo@mail.demo to see the returning-customer skip.</span>
        </div>
      </form>

      {contactSaved && returning ? (
        <div className="mt-10 flex items-start gap-4 border border-ok/30 bg-ok/8 p-5">
          <ShieldCheck className="size-6 shrink-0 text-ok" />
          <div>
            <p className="font-semibold">Welcome back{knownCustomer ? `, ${knownCustomer.name.split(' ')[0]}` : ''} — you’re already verified.</p>
            <p className="mt-1 text-[14px] text-paper/75">Your NIN, licence and selfie checks are on file, so you can skip this step.</p>
          </div>
        </div>
      ) : contactSaved ? (
        <div className="mt-10 grid gap-10">
          {/* NIN */}
          <section aria-labelledby="nin-h">
            <h3 id="nin-h" className="label text-mute">1 / National Identification Number</h3>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <Input
                inputMode="numeric"
                autoComplete="off"
                maxLength={11}
                placeholder="11-digit NIN"
                value={nin}
                onChange={(e) => setNin(e.target.value.replace(/\D/g, ''))}
                aria-label="NIN"
                className="sm:max-w-xs"
                disabled={draft.nin === 'verified'}
              />
              <Button type="button" onClick={checkNin} disabled={nin.length !== 11 || busy !== null || draft.nin === 'verified'} loading={busy === 'nin'}>
                Check NIN
              </Button>
            </div>
            <p className="mt-2 text-[13px] text-mute">Demo: NIN ending in 0 fails, ending in 9 goes to review, anything else passes.</p>
            {ninMsg ? <p className={cn('mt-2 text-[14px]', draft.nin === 'failed' ? 'text-bad' : draft.nin === 'review' ? 'text-warn' : 'text-ok')}>{ninMsg}</p> : null}
          </section>

          {/* Licence */}
          {needsLicence && (
            <section aria-labelledby="lic-h">
              <h3 id="lic-h" className="label text-mute">2 / Driver’s licence photo</h3>
              <label className={cn('mt-3 flex cursor-pointer items-center gap-4 border border-dashed p-5 transition-colors hover:border-paper', draft.licence === 'verified' ? 'border-ok/50' : 'border-line-strong')}>
                <FileImage className="size-7 text-mute" />
                <span className="flex-1 text-[14px]">
                  <span className="block font-semibold">{licenceFile ? licenceFile.name : 'Upload the front of your licence'}</span>
                  <span className="text-mute">JPG or PNG, clear and readable</span>
                </span>
                <span className="label border border-line-strong px-3 py-2">{licenceFile ? 'Replace' : 'Choose file'}</span>
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => checkLicence(e.target.files?.[0] ?? null)} disabled={busy !== null} />
              </label>
              {busy === 'licence' ? <p className="mt-2 flex items-center gap-2 text-[14px] text-mute"><Loader2 className="size-4 animate-spin" /> Reading licence…</p> : licenceMsg ? <p className={cn('mt-2 text-[14px]', draft.licence === 'failed' ? 'text-bad' : 'text-ok')}>{licenceMsg}</p> : null}
            </section>
          )}

          {/* Selfie */}
          <section aria-labelledby="selfie-h">
            <h3 id="selfie-h" className="label text-mute">{needsLicence ? '3' : '2'} / Live selfie</h3>
            <p className="mt-2 text-[14px] text-paper/75">Look straight at the camera in good light. We compare it to your ID photo.</p>
            <div className="mt-5">
              <SelfieCapture scanning={busy === 'selfie'} onCapture={(src) => checkSelfie(src)} />
            </div>
            {selfieMsg && busy !== 'selfie' ? <p className={cn('mt-4 text-center text-[14px]', draft.selfie === 'verified' ? 'text-ok' : 'text-warn')}>{selfieMsg}</p> : null}
          </section>

          {/* Results */}
          <section className="border border-line bg-ink-2 px-5 py-2" aria-live="polite">
            <StatusRow label="NIN" status={draft.nin} busy={busy === 'nin'} />
            {needsLicence && <StatusRow label="Licence" status={draft.licence} busy={busy === 'licence'} />}
            <StatusRow label="Selfie match" status={draft.selfie} busy={busy === 'selfie'} />
          </section>
          <AnimatePresence>
            {overall && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={cn('flex items-start gap-4 border p-5', overall === 'verified' ? 'border-ok/40 bg-ok/8' : overall === 'review' ? 'border-warn/40 bg-warn/8' : 'border-bad/40 bg-bad/8')}>
                {overall === 'verified' ? <CheckCircle2 className="size-6 shrink-0 text-ok" /> : overall === 'review' ? <Clock className="size-6 shrink-0 text-warn" /> : <AlertTriangle className="size-6 shrink-0 text-bad" />}
                <div>
                  <p className="font-semibold">{overall === 'verified' ? 'Verified' : overall === 'review' ? 'Under review' : 'Verification failed'}</p>
                  <p className="mt-1 text-[14px] text-paper/80">
                    {overall === 'verified'
                      ? 'All checks passed. You won’t need to do this again.'
                      : overall === 'review'
                        ? 'You can continue. A team member will confirm before pick-up (usually within 15 minutes).'
                        : 'One of the checks failed. Fix it above, or message us on WhatsApp and we’ll help.'}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <p className="mt-8 text-[14px] text-mute">Save your details to start verification.</p>
      )}
      <StepNav
        back={back}
        disabled={!contactSaved || (!returning && (!overall || overall === 'failed'))}
        onNext={() => {
          const v = getValues()
          if (returning) set({ skipVerification: true, nin: 'verified', licence: 'verified', selfie: 'verified' })
          if (overall === 'verified' || returning) verificationService.rememberVerified(v.email || draft.email)
          next()
        }}
      />
    </div>
  )
}

// ---------------------------------------------------------------- 4. Agreement
export function StepAgreement({ draft, set, next, back, car, state }: StepProps) {
  const [scrolled, setScrolled] = useState(false)
  if (!car) return null
  const s = startOf(draft)
  const e = endOf(draft)
  const clauses = [
    ['Parties', `This agreement is between ${brand.name} (“we”) and ${draft.name || 'the renter'} (“you”) for the ${carName(car)}, plate ${car.plate}.`],
    ['Rental period', `From ${fmtDay(s)} ${fmtTime(s)} at ${locationName(draft.pickup)} to ${fmtDay(e)} ${fmtTime(e)} at ${locationName(draft.dropoff)}. Late returns are charged ${naira(state.settings.lateFeePerHour)} per hour after a ${state.settings.graceMinutes}-minute grace period.`],
    ['Deposit', state.settings.depositRule],
    ['Fuel', state.settings.fuelPolicy],
    ['Use of the car', `The car may only be driven by verified drivers named on this booking${draft.mode === 'chauffeur' ? ' (our chauffeur)' : ''}. No ride-hailing, racing, towing or carrying illegal goods. Interstate travel needs an interstate permit on the booking.`],
    ['Tracking and safety', 'The car is fitted with GPS tracking. You agree that its location, speed and driving events are recorded for safety and recovery. If the car leaves its approved area or is reported stolen, we may remotely prevent it from restarting once it is stationary.'],
    ['Damage and fines', 'Any new damage is recorded with photos at return and compared with the check-out photos. Repair costs, traffic fines (e.g. LASTMA, FRSC) and towing are deducted from the deposit with evidence. Mechanical failures not caused by misuse are our responsibility.'],
    ['Accidents and breakdowns', `Contact us immediately on ${brand.contact.phoneDisplay} or WhatsApp. Do not arrange private repairs. We will send recovery and, where possible, a replacement car.`],
    ['Cancellation', `Free cancellation up to ${state.settings.cancellationHours} hours before pick-up. Within ${state.settings.cancellationHours} hours, one day’s rental is kept. Deposits are refunded in full on cancellation.`],
    ['Data', 'Identity checks are done by a licensed provider. We store the result and a reference only, never your raw NIN or selfie image.'],
    ['Law', 'This agreement is governed by the laws of the Federal Republic of Nigeria.'],
  ]
  return (
    <div>
      <h2 className="display text-[clamp(26px,3vw,38px)] font-bold uppercase tracking-[-0.02em]">Rental agreement</h2>
      <p className="mt-3 text-[15px] text-paper/75">Read through to the end, then sign below.</p>
      <div
        data-lenis-prevent
        tabIndex={0}
        onScroll={(ev) => {
          const t = ev.currentTarget
          if (t.scrollTop + t.clientHeight >= t.scrollHeight - 24) setScrolled(true)
        }}
        className="mt-6 h-80 overflow-y-auto border border-line bg-ink-2 p-5 text-[14.5px] leading-relaxed"
        aria-label="Rental agreement text"
      >
        <p className="font-display text-[16px] font-bold uppercase">{brand.name} — Vehicle rental agreement</p>
        <ol className="mt-4 flex flex-col gap-4">
          {clauses.map(([h, b], i) => (
            <li key={h}>
              <p className="font-semibold">{i + 1}. {h}</p>
              <p className="mt-1 text-paper/80">{b}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-mute">End of agreement.</p>
      </div>
      {!scrolled && <p className="mt-2 text-[13px] text-mute">Scroll to the end of the agreement to continue.</p>}
      <div className="mt-8">
        <p className="label mb-3 text-mute">Your signature</p>
        <SignaturePad onChange={(sig) => set({ signature: sig })} />
      </div>
      <label className="mt-6 flex cursor-pointer items-start gap-3 text-[15px]">
        <input type="checkbox" checked={!!draft.agreed} onChange={(ev) => set({ agreed: ev.target.checked })} className="mt-1 size-4 accent-[var(--brand-accent)]" />
        I, {draft.name || 'the renter'}, have read and agree to this rental agreement.
      </label>
      <StepNav back={back} onNext={next} disabled={!scrolled || !draft.signature || !draft.agreed} nextLabel="Sign and continue" />
    </div>
  )
}
