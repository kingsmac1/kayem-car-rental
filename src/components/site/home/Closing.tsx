import { Link } from '@tanstack/react-router'
import { Accordion } from 'radix-ui'
import { ArrowRight, Plus } from 'lucide-react'
import { faqs, testimonials } from '@/data/content'
import { images, sm } from '@/data/images'
import { Button } from '@/components/ui/button'
import { RevealGroup, SplitHeading } from '../Reveal'
import { Magnetic } from '../Magnetic'

export function Testimonials() {
  return (
    <section className="border-t border-line py-24 md:py-32" aria-labelledby="reviews-title">
      <div className="container-x">
        <SplitHeading className="display text-[clamp(36px,6vw,88px)] font-extrabold uppercase tracking-[-0.04em]">
          <span id="reviews-title">Riders say</span>
        </SplitHeading>
        <RevealGroup className="mt-14 grid gap-px bg-line md:grid-cols-2 xl:grid-cols-4">
          {testimonials.map((t) => (
            <figure key={t.name} className="flex flex-col justify-between gap-10 bg-ink p-6 md:p-8">
              <blockquote className="text-[18px] leading-snug text-paper/90">“{t.quote}”</blockquote>
              <figcaption>
                <p className="font-semibold">{t.name}</p>
                <p className="label mt-1 text-mute">{t.role}</p>
              </figcaption>
            </figure>
          ))}
        </RevealGroup>
        <p className="label mt-4 text-paper/30">Sample reviews for the demo</p>
      </div>
    </section>
  )
}

export function CtaBlocks() {
  return (
    <section className="border-t border-line" aria-label="For businesses and car owners">
      <div className="chequer h-10 bg-ink opacity-[0.08]" aria-hidden />
      <div className="grid md:grid-cols-2">
        <div className="relative overflow-hidden border-line p-[var(--gutter)] py-20 md:border-r md:py-28">
          <img src={sm(images.cars.sClass)} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-25 grayscale" />
          <div className="relative">
            <h2 className="display max-w-[12ch] text-[clamp(32px,4.4vw,64px)] font-extrabold uppercase tracking-[-0.04em]">Cars for your whole team</h2>
            <p className="mt-5 max-w-sm text-paper/80">Monthly invoices, staff bookers, credit terms and a dedicated account manager. Built for companies, embassies, hotels and event planners.</p>
            <Magnetic>
              <Button asChild size="lg" roll className="mt-8" icon={<ArrowRight className="size-4" />}>
                <Link to="/business">Open a corporate account</Link>
              </Button>
            </Magnetic>
          </div>
        </div>
        <div className="relative overflow-hidden bg-accent p-[var(--gutter)] py-20 text-accent-ink md:py-28">
          <div className="relative">
            <h2 className="display max-w-[12ch] text-[clamp(32px,4.4vw,64px)] font-extrabold uppercase tracking-[-0.04em]">Earn from your car</h2>
            <p className="mt-5 max-w-sm text-accent-ink/80">List your car with us. We verify renters, track the car, handle insurance and pay you monthly. You keep up to 80%.</p>
            <Magnetic>
              <Button asChild size="lg" variant="dark" roll className="mt-8" icon={<ArrowRight className="size-4" />}>
                <Link to="/earn">See what you could earn</Link>
              </Button>
            </Magnetic>
          </div>
        </div>
      </div>
    </section>
  )
}

export function FaqList({ items = faqs, className }: { items?: { q: string; a: string }[]; className?: string }) {
  return (
    <Accordion.Root type="single" collapsible className={className}>
      {items.map((f, i) => (
        <Accordion.Item key={i} value={`q${i}`} className="border-b border-line">
          <Accordion.Header>
            <Accordion.Trigger className="group flex w-full items-center justify-between gap-6 py-6 text-left text-[clamp(17px,1.6vw,21px)] font-semibold transition-colors hover:text-accent">
              {f.q}
              <Plus className="size-5 shrink-0 transition-transform duration-500 [transition-timing-function:var(--ease-out-expo)] group-data-[state=open]:rotate-45" aria-hidden />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="overflow-hidden data-[state=closed]:animate-[accUp_.3s_ease-out] data-[state=open]:animate-[accDown_.4s_var(--ease-out-expo)]">
            <p className="max-w-[68ch] pb-6 text-[16px] leading-relaxed text-paper/75">{f.a}</p>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  )
}

export function FaqSection() {
  return (
    <section className="border-t border-line py-24 md:py-32" aria-labelledby="faq-title">
      <div className="container-x grid gap-12 lg:grid-cols-[1fr_1.6fr]">
        <div>
          <SplitHeading className="display text-[clamp(36px,5vw,72px)] font-extrabold uppercase tracking-[-0.04em]">
            <span id="faq-title">Questions</span>
          </SplitHeading>
          <p className="mt-5 max-w-sm text-paper/75">Still unsure? Ask us on WhatsApp — a real person is always one message away.</p>
          <Link to="/faq" className="label mt-6 inline-block text-accent hover:underline">All questions</Link>
        </div>
        <FaqList items={faqs.slice(0, 6)} />
      </div>
    </section>
  )
}
