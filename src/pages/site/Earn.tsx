import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle2 } from 'lucide-react'
import { brand } from '@/config/brand'
import { db } from '@/lib/db'
import { cn, latency, naira } from '@/lib/utils'
import type { PartnerOwner } from '@/mocks/types'
import { emailService } from '@/services/email'
import { PageHeader } from '@/components/site/PageHeader'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/input'

const CLASSES = [
  { id: 'saloon', label: 'Saloon (Corolla, Camry, Elantra)', daily: 55000 },
  { id: 'suv', label: 'SUV (RAV4, Highlander, Prado)', daily: 120000 },
  { id: 'luxury-suv', label: 'Luxury SUV (Lexus, GLE, Range Rover)', daily: 230000 },
  { id: 'luxury-saloon', label: 'Luxury saloon (E-Class, S-Class)', daily: 250000 },
  { id: 'van', label: 'Van or bus (Hiace, Coaster)', daily: 110000 },
]
const COMMISSION = 0.25

const steps = [
  ['Apply', 'Tell us about your car. We check papers, condition and ownership — usually within 48 hours.'],
  ['We prepare it', 'We fit a GPS tracker, photograph the car, and list it at the right price for your city.'],
  ['Verified renters only', 'Every renter passes NIN, licence and selfie checks. Deposits cover small damage; insurance covers the rest.'],
  ['Get paid monthly', `You see every trip and kobo in your owner portal. Payouts land on the 5th of each month, minus our ${COMMISSION * 100}% commission.`],
]

const schema = z.object({
  name: z.string().trim().min(3, 'Enter your full name.'),
  phone: z.string().trim().regex(/^(\+?234|0)[789][01]\d{8}$/, 'Enter a Nigerian mobile number.'),
  email: z.string().trim().email('Enter a valid email.'),
  city: z.string(),
  make: z.string().trim().min(2, 'Enter the make.'),
  model: z.string().trim().min(1, 'Enter the model.'),
  year: z.coerce.number().int().min(2015, 'We accept cars from 2015 or newer.').max(new Date().getFullYear() + 1, 'Check the year.'),
})
type Form = z.input<typeof schema>

export default function Earn() {
  const [cls, setCls] = useState('suv')
  const [days, setDays] = useState(15)
  const [sent, setSent] = useState(false)
  const calc = useMemo(() => {
    const c = CLASSES.find((x) => x.id === cls)!
    const gross = c.daily * days
    const fee = Math.round(gross * COMMISSION)
    return { gross, fee, net: gross - fee, yearly: (gross - fee) * 12 }
  }, [cls, days])

  const { register, handleSubmit, formState } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { city: brand.cities[0] } })
  const submit = handleSubmit(async (raw) => {
    const v = schema.parse(raw)
    await latency(700, 1000)
    const p: PartnerOwner = { id: `p-${Date.now()}`, name: v.name, phone: v.phone, email: v.email, city: v.city as PartnerOwner['city'], commission: COMMISSION, status: 'pending', joined: new Date().toISOString(), payoutPending: 0, paidOut: 0, pendingCar: { make: v.make, model: v.model, year: v.year } }
    db.set((d) => {
      d.partners.unshift(p)
    })
    void emailService.enquiry('partner', v.email, v.name, [['Name', v.name], ['Phone', v.phone], ['City', v.city], ['Car', `${v.year} ${v.make} ${v.model}`]])
    setSent(true)
  })

  return (
    <>
      <PageHeader title="Earn from your car" intro="Your car sits idle most of the week. List it with us — verified renters, GPS tracking, insurance and monthly payouts." />
      <section className="container-x grid gap-12 py-20 lg:grid-cols-2">
        <div>
          <h2 className="display text-[clamp(28px,3.4vw,48px)] font-extrabold uppercase tracking-[-0.03em]">Earnings calculator</h2>
          <div className="mt-8 flex flex-col gap-6">
            <Field label="Your car" htmlFor="cls">
              <Select id="cls" value={cls} onChange={(e) => setCls(e.target.value)}>
                {CLASSES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </Select>
            </Field>
            <div>
              <label htmlFor="days" className="label flex justify-between text-mute">
                <span>Days rented per month</span>
                <span className="num text-accent">{days} days</span>
              </label>
              <input id="days" type="range" min={4} max={26} value={days} onChange={(e) => setDays(Number(e.target.value))} className="mt-4 w-full accent-[var(--brand-accent)]" />
              <p className="mt-2 text-[13px] text-mute">Our average is 15 days for SUVs, 18 in December.</p>
            </div>
          </div>
        </div>
        <div className="border border-line-strong bg-ink-2 p-6 md:p-8" aria-live="polite">
          <p className="label text-mute">You could earn</p>
          <p className="num mt-2 text-[clamp(40px,6vw,72px)] leading-none text-accent">{naira(calc.net)}</p>
          <p className="mt-2 text-mute">per month · about <span className="num text-paper">{naira(calc.yearly)}</span> a year</p>
          <dl className="mt-8 border-t border-line text-[15px]">
            <div className="flex justify-between border-b border-line py-3"><dt>Rental income</dt><dd className="num">{naira(calc.gross)}</dd></div>
            <div className="flex justify-between border-b border-line py-3"><dt>Our commission ({COMMISSION * 100}%)</dt><dd className="num text-mute">−{naira(calc.fee)}</dd></div>
            <div className="flex justify-between py-3 font-semibold"><dt>Paid to you</dt><dd className="num">{naira(calc.net)}</dd></div>
          </dl>
          <p className="text-[13px] text-mute">Estimate only. Fuel is paid by renters; tracking, cleaning and insurance admin are included.</p>
        </div>
      </section>
      <section className="border-t border-line">
        <div className="container-x py-20">
          <h2 className="display text-[clamp(28px,3.4vw,48px)] font-extrabold uppercase tracking-[-0.03em]">How it works</h2>
          <ol className="mt-10 grid gap-px bg-line md:grid-cols-4">
            {steps.map(([t, b], i) => (
              <li key={t} className="bg-ink p-6">
                <span className="num text-accent">{i + 1}/{steps.length}</span>
                <h3 className="display mt-4 text-[20px] font-bold uppercase">{t}</h3>
                <p className="mt-3 text-[15px] text-paper/75">{b}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section className="border-t border-line">
        <div className="container-x grid gap-12 py-20 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <h2 className="display text-[clamp(28px,3.4vw,48px)] font-extrabold uppercase tracking-[-0.03em]">List your car</h2>
            <p className="mt-4 max-w-md text-paper/75">Cars from 2015 or newer, in good condition, with valid papers. We reply within 48 hours.</p>
          </div>
          {sent ? (
            <div className="flex flex-col items-start gap-4 border border-ok/40 bg-ok/8 p-8" role="status">
              <CheckCircle2 className="size-8 text-ok" />
              <p className="display text-[24px] font-bold uppercase">Application received</p>
              <p className="text-paper/80">We’ll call you within 48 hours to book an inspection. Your application now shows in the admin “Partner owners” queue (try it in the demo switcher).</p>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className={cn('grid gap-5 sm:grid-cols-2')}>
              <Field label="Full name" htmlFor="pn" error={formState.errors.name?.message}><Input id="pn" {...register('name')} aria-invalid={!!formState.errors.name} /></Field>
              <Field label="Phone (WhatsApp)" htmlFor="pp" error={formState.errors.phone?.message}><Input id="pp" type="tel" {...register('phone')} aria-invalid={!!formState.errors.phone} /></Field>
              <Field label="Email" htmlFor="pe" error={formState.errors.email?.message}><Input id="pe" type="email" {...register('email')} aria-invalid={!!formState.errors.email} /></Field>
              <Field label="City" htmlFor="pc"><Select id="pc" {...register('city')}>{brand.cities.map((c) => <option key={c}>{c}</option>)}</Select></Field>
              <Field label="Make" htmlFor="pm" error={formState.errors.make?.message}><Input id="pm" placeholder="Toyota" {...register('make')} aria-invalid={!!formState.errors.make} /></Field>
              <Field label="Model" htmlFor="pmo" error={formState.errors.model?.message}><Input id="pmo" placeholder="Highlander" {...register('model')} aria-invalid={!!formState.errors.model} /></Field>
              <Field label="Year" htmlFor="py" error={formState.errors.year?.message}><Input id="py" inputMode="numeric" placeholder="2021" {...register('year')} aria-invalid={!!formState.errors.year} /></Field>
              <div className="flex items-end"><Button type="submit" size="lg" roll loading={formState.isSubmitting} className="w-full">Apply to list</Button></div>
            </form>
          )}
        </div>
      </section>
    </>
  )
}
