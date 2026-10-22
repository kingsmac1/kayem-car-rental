import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle2, Mail, MapPin, Phone } from 'lucide-react'
import { brand } from '@/config/brand'
import { latency, waLink } from '@/lib/utils'
import { locations } from '@/mocks/locations'
import { PageHeader } from '@/components/site/PageHeader'
import { WhatsAppGlyph } from '@/components/site/SocialIcons'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/input'

const schema = z.object({
  name: z.string().trim().min(2, 'Enter your name.'),
  email: z.string().trim().email('Enter a valid email.'),
  topic: z.string(),
  message: z.string().trim().min(10, 'Tell us a little more (10+ characters).').max(1000, 'Keep it under 1,000 characters.'),
})
type Form = z.infer<typeof schema>

export default function Contact() {
  const [sent, setSent] = useState(false)
  const { register, handleSubmit, formState, reset } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { topic: 'A booking' } })
  const offices = locations.filter((l) => l.kind === 'office')
  return (
    <>
      <PageHeader title="Talk to us" intro="The fastest way is WhatsApp — a real person replies around the clock. Or call, email, or use the form." />
      <section className="container-x grid gap-12 py-20 lg:grid-cols-[1fr_1.2fr]">
        <div className="flex flex-col gap-4">
          <a href={waLink('Hi, I have a question')} target="_blank" rel="noreferrer" className="group flex items-center gap-4 border border-line bg-ink-2 p-5 hover:border-accent">
            <WhatsAppGlyph className="size-6 text-accent" />
            <span><span className="block font-semibold">WhatsApp 24/7</span><span className="text-[14px] text-mute">{brand.contact.phoneDisplay}</span></span>
          </a>
          <a href={`tel:${brand.contact.phoneTel}`} className="flex items-center gap-4 border border-line bg-ink-2 p-5 hover:border-accent">
            <Phone className="size-6 text-accent" />
            <span><span className="block font-semibold">Call</span><span className="text-[14px] text-mute">{brand.contact.phoneDisplay}</span></span>
          </a>
          <a href={`mailto:${brand.contact.email}`} className="flex items-center gap-4 border border-line bg-ink-2 p-5 hover:border-accent">
            <Mail className="size-6 text-accent" />
            <span><span className="block font-semibold">Email</span><span className="text-[14px] text-mute">{brand.contact.email}</span></span>
          </a>
          <h2 className="label mt-6 text-mute">Offices</h2>
          <ul className="flex flex-col gap-3">
            {offices.map((o) => (
              <li key={o.id} className="flex gap-3 text-[15px]"><MapPin className="mt-0.5 size-4 shrink-0 text-accent" /><span><span className="font-semibold">{o.city}</span> — {o.name}</span></li>
            ))}
          </ul>
          <p className="text-[14px] text-mute">{brand.contact.hours}</p>
        </div>
        {sent ? (
          <div className="flex flex-col items-start gap-4 border border-ok/40 bg-ok/8 p-8" role="status">
            <CheckCircle2 className="size-8 text-ok" />
            <p className="display text-[24px] font-bold uppercase">Message sent</p>
            <p className="text-paper/80">We reply to emails within a few hours (faster on WhatsApp).</p>
            <Button variant="ghost" onClick={() => { reset(); setSent(false) }}>Send another</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(async () => { await latency(600, 900); setSent(true) })} noValidate className="grid gap-5 sm:grid-cols-2">
            <Field label="Name" htmlFor="n" error={formState.errors.name?.message}><Input id="n" autoComplete="name" {...register('name')} aria-invalid={!!formState.errors.name} /></Field>
            <Field label="Email" htmlFor="e" error={formState.errors.email?.message}><Input id="e" type="email" autoComplete="email" {...register('email')} aria-invalid={!!formState.errors.email} /></Field>
            <Field label="Topic" htmlFor="t" className="sm:col-span-2"><Select id="t" {...register('topic')}>{['A booking', 'Deposit or refund', 'Corporate account', 'Listing my car', 'Something else'].map((k) => <option key={k}>{k}</option>)}</Select></Field>
            <Field label="Message" htmlFor="m" className="sm:col-span-2" error={formState.errors.message?.message}><Textarea id="m" rows={6} {...register('message')} aria-invalid={!!formState.errors.message} /></Field>
            <div className="sm:col-span-2"><Button type="submit" size="lg" roll loading={formState.isSubmitting}>Send message</Button></div>
          </form>
        )}
      </section>
    </>
  )
}
