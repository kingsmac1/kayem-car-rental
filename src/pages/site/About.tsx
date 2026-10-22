import { Link } from '@tanstack/react-router'
import { brand } from '@/config/brand'
import { images, sm } from '@/data/images'
import { PageHeader } from '@/components/site/PageHeader'
import { CountUp, RevealGroup } from '@/components/site/Reveal'
import { Button } from '@/components/ui/button'

const gallery = [
  { src: images.scenes.lagosNight, caption: 'Victoria Island after dark', span: 'md:col-span-2 md:row-span-2' },
  { src: images.scenes.mercWheel, caption: 'Chauffeur-ready interiors', span: '' },
  { src: images.cars.landCruiser, caption: 'Land Cruiser 300, Lekki', span: '' },
  { src: images.scenes.wedding, caption: 'Wedding convoys', span: '' },
  { src: images.scenes.headlightBmw, caption: 'Inspected between every trip', span: '' },
  { src: images.scenes.lagosAerial, caption: 'Lagos, where it started', span: 'md:col-span-2' },
  { src: images.cars.rangeRover, caption: 'Range Rover on the coast road', span: '' },
]

export default function About() {
  return (
    <>
      <PageHeader title="Built for how Nigeria rents" intro={<>{brand.name} started with three cars in Lekki and one rule: every renter verified, every car tracked, every deposit explained. Today we run in {brand.cities.join(', ')}.</>} />
      <section className="container-x"><div className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
        {brand.stats.map((s) => (
          <div key={s.label} className="bg-ink py-10 pl-6 first:pl-0">
            <p className="display text-[clamp(40px,5vw,64px)] font-extrabold"><CountUp value={s.value} suffix={s.suffix} className="font-display" /></p>
            <p className="label mt-2 text-mute">{s.label}</p>
          </div>
        ))}
        </div>
      </section>
      <section className="border-t border-line py-20">
        <div className="container-x grid gap-12 lg:grid-cols-2">
          <h2 className="display text-[clamp(30px,4vw,56px)] font-extrabold uppercase tracking-[-0.04em]">Trust before keys</h2>
          <div className="flex flex-col gap-5 text-[17px] leading-relaxed text-paper/80">
            <p>Car rental in Nigeria has a trust problem on both sides. Owners worry about who is driving their car. Renters worry about surprise charges and deposits that never come back.</p>
            <p>So we built the whole business around evidence. Identity is checked before a booking is confirmed. Every car reports its location. Every handover has a photo walkaround, and any charge comes with the photos that prove it.</p>
            <p>And because Nigerians live on WhatsApp, so do we — booking, extensions and roadside help, around the clock.</p>
          </div>
        </div>
      </section>
      <section className="border-t border-line py-20" aria-labelledby="gallery-title">
        <div className="container-x">
          <h2 id="gallery-title" className="display text-[clamp(30px,4vw,56px)] font-extrabold uppercase tracking-[-0.04em]">On the road</h2>
          <RevealGroup as="ul" className="mt-10 grid auto-rows-[220px] gap-3 md:grid-cols-4 md:auto-rows-[240px]">
            {gallery.map((g) => (
              <li key={g.src} className={`group relative overflow-hidden ${g.span}`}>
                <img src={g.span ? g.src : sm(g.src)} alt={g.caption} loading="lazy" className="h-full w-full object-cover grayscale transition-[transform,filter] duration-700 [transition-timing-function:var(--ease-out-expo)] group-hover:scale-105 group-hover:grayscale-0" />
                <p className="label absolute bottom-0 left-0 translate-y-full bg-accent px-3 py-2 text-accent-ink transition-transform duration-500 [transition-timing-function:var(--ease-out-expo)] group-hover:translate-y-0 [@media(hover:none)]:translate-y-0">{g.caption}</p>
              </li>
            ))}
          </RevealGroup>
        </div>
      </section>
      <section className="border-t border-line py-20">
        <div className="container-x flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <h2 className="display max-w-[16ch] text-[clamp(28px,3.4vw,48px)] font-extrabold uppercase tracking-[-0.03em]">Ready when you are</h2>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" roll><Link to="/fleet">Browse the fleet</Link></Button>
            <Button asChild size="lg" variant="ghost" roll><Link to="/contact">Talk to us</Link></Button>
          </div>
        </div>
      </section>
    </>
  )
}
