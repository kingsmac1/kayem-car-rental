import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle2 } from 'lucide-react'
import { brand } from '@/config/brand'
import { db } from '@/lib/db'
import { latency } from '@/lib/utils'
import { images, sm } from '@/data/images'
import { emailService } from '@/services/email'
import { PageHeader } from '@/components/site/PageHeader'
import { RevealGroup } from '@/components/site/Reveal'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/input'

const benefits = [
  { title: 'One monthly invoice', body: 'Every trip your team takes, on one VAT-ready invoice with cost-centre tags. Pay by transfer on 30-day terms.' },
  { title: 'Staff bookers', body: 'Give assistants and travel desks their own logins. Set who can book which cars, and approve trips over a limit.' },
  { title: 'Corporate rates', body: 'Negotiated rates from 8–15% below public prices, plus priority during December and peak events.' },
  { title: 'Vetted chauffeurs', body: 'Uniformed, background-checked drivers who know the embassies, hotels and airports by heart.' },
  { title: 'Live tracking', body: 'See where your guests and executives are in real time, with arrival alerts for airport pickups.' },
  { title: 'Dedicated account manager', body: 'One named person on WhatsApp who knows your team, your preferences and your schedule.' },
]

const schema = z.object({
  company: z.string().trim().min(2, 'Enter your organisation’s name.'),
  kind: z.enum(['Company', 'Embassy', 'Hotel', 'Event planner', 'Other']),
  name: z.string().trim().min(3, 'Enter your name.'),
  email: z.string().trim().email('Enter a valid work email.'),
  phone: z.string().trim().min(10, 'Enter a phone number we can reach.'),
  city: z.string(),
  volume: z.string(),
  message: z.string().max(800, 'Keep it under 800 characters.').optional(),
})
type Form = z.infer<typeof schema>

export default function Business() {
  const [sent, setSent] = useState<string | null>(null)
  const { register, handleSubmit, formState } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { kind: 'Company', city: brand.cities[0], volume: '5–20 trips a month' } })
  const submit = handleSubmit(async (v) => {
    await latency(700, 1100)
    db.set((d) => {
      d.audit.unshift({ id: `a-${Date.now()}`, at: new Date().toISOString(), actor: 'Website', role: 'Front Desk', action: `New corporate enquiry: ${v.company} (${v.kind}, ${v.city})` })
    })
    void emailService.enquiry('corporate', v.email, v.name, [['Company', v.company], ['Type', v.kind], ['Name', v.name], ['Phone', v.phone], ['City', v.city], ['Volume', v.volume]], v.message)
    setSent(v.company)
  })

  return (
    <>
      <PageHeader title="Cars for your whole team" intro="Companies, embassies, hotels and event planners use us to move guests and staff safely, with one invoice at the end of the month." />
      <section className="container-x py-20">
        <RevealGroup className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((b) => (
            <div key={b.title} className="bg-ink p-6 md:p-8">
              <h2 className="display text-[22px] font-bold uppercase tracking-[-0.02em]">{b.title}</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-paper/75">{b.body}</p>
            </div>
          ))}
        </RevealGroup>
      </section>
      <section className="border-t border-line">
        <div className="container-x grid gap-12 py-20 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <h2 className="display text-[clamp(30px,4vw,56px)] font-extrabold uppercase tracking-[-0.04em]">Open an account</h2>
            <p className="mt-4 max-w-md text-paper/75">Tell us a little about your team. We’ll reply within one working day with rates and a sample invoice.</p>
            <img src={sm(images.cars.gls)} alt="Black Mercedes-Benz GLS parked in a showroom" className="mt-10 aspect-[4/3] w-full max-w-md object-cover grayscale" loading="lazy" />
          </div>
          {sent ? (
            <div className="flex flex-col items-start gap-4 border border-ok/40 bg-ok/8 p-8" role="status">
              <CheckCircle2 className="size-8 text-ok" />
              <p className="display text-[26px] font-bold uppercase">Enquiry received</p>
              <p className="text-paper/80">Thanks — an account manager will contact {sent} within one working day. For anything urgent, WhatsApp {brand.contact.phoneDisplay}.</p>
              <Button variant="ghost" onClick={() => setSent(null)}>Send another enquiry</Button>
            </div>
          ) : (
            <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2" noValidate>
              <Field label="Organisation" htmlFor="company" error={formState.errors.company?.message}><Input id="company" {...register('company')} aria-invalid={!!formState.errors.company} /></Field>
              <Field label="Type" htmlFor="kind"><Select id="kind" {...register('kind')}>{['Company', 'Embassy', 'Hotel', 'Event planner', 'Other'].map((k) => <option key={k}>{k}</option>)}</Select></Field>
              <Field label="Your name" htmlFor="cname" error={formState.errors.name?.message}><Input id="cname" autoComplete="name" {...register('name')} aria-invalid={!!formState.errors.name} /></Field>
              <Field label="Work email" htmlFor="cemail" error={formState.errors.email?.message}><Input id="cemail" type="email" autoComplete="email" {...register('email')} aria-invalid={!!formState.errors.email} /></Field>
              <Field label="Phone" htmlFor="cphone" error={formState.errors.phone?.message}><Input id="cphone" type="tel" autoComplete="tel" {...register('phone')} aria-invalid={!!formState.errors.phone} /></Field>
              <Field label="Main city" htmlFor="ccity"><Select id="ccity" {...register('city')}>{brand.cities.map((c) => <option key={c}>{c}</option>)}</Select></Field>
              <Field label="Expected volume" htmlFor="vol" className="sm:col-span-2"><Select id="vol" {...register('volume')}>{['1–5 trips a month', '5–20 trips a month', '20–50 trips a month', '50+ trips a month', 'One-off event'].map((k) => <option key={k}>{k}</option>)}</Select></Field>
              <Field label="Anything else? (optional)" htmlFor="msg" className="sm:col-span-2" error={formState.errors.message?.message}><Textarea id="msg" {...register('message')} placeholder="e.g. airport pickups for visiting directors, 2 chauffeured SUVs daily" /></Field>
              <div className="sm:col-span-2"><Button type="submit" size="lg" roll loading={formState.isSubmitting}>Send enquiry</Button></div>
            </form>
          )}
        </div>
      </section>
    </>
  )
}
