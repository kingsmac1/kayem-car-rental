import { useRef } from 'react'
import { partnerLogos } from '@/data/content'
import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap'
import { prefersReducedMotion } from '@/lib/env'

const rows = [
  { label: 'Payments', items: partnerLogos.payments },
  { label: 'Trusted by', items: partnerLogos.corporate },
  { label: 'Insured with', items: partnerLogos.insurance },
]

/** Placeholder partner wordmark — replace with real SVG logos per client. */
function Wordmark({ name, i }: { name: string; i: number }) {
  const styles = ['font-display font-bold tracking-[-0.02em]', 'font-body font-extrabold uppercase tracking-[0.12em]', 'font-label uppercase tracking-[0.2em] text-[0.75em]', 'font-display font-medium italic', 'font-body font-semibold lowercase tracking-tight']
  return (
    <span className={`inline-flex items-center gap-3 whitespace-nowrap text-[clamp(20px,2.4vw,30px)] text-paper/45 ${styles[i % styles.length]}`}>
      <span className="size-2.5 bg-paper/30" aria-hidden />
      {name}
    </span>
  )
}

/** Infinite logo marquee (GSAP owns it; speeds up with scroll velocity). */
export function Marquee() {
  const root = useRef<HTMLElement>(null)
  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      const tracks = gsap.utils.toArray<HTMLElement>('[data-track]')
      const tweens = tracks.map((t, i) => {
        const dir = i % 2 ? 1 : -1
        return gsap.fromTo(t, { xPercent: dir === -1 ? 0 : -50 }, { xPercent: dir === -1 ? -50 : 0, duration: 38 + i * 6, ease: 'none', repeat: -1 })
      })
      const st = ScrollTrigger.create({
        trigger: root.current,
        start: 'top bottom',
        end: 'bottom top',
        onUpdate: (self) => {
          const v = Math.min(4, 1 + Math.abs(self.getVelocity()) / 900)
          tweens.forEach((tw) => gsap.to(tw, { timeScale: v, duration: 0.3, overwrite: true, onComplete: () => void gsap.to(tw, { timeScale: 1, duration: 1.2 }) }))
        },
      })
      return () => st.kill()
    },
    { scope: root },
  )

  return (
    <section ref={root} className="overflow-hidden border-t border-line py-16" aria-label="Partners">
      <div className="flex flex-col gap-8">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-6">
            <p className="label w-28 shrink-0 pl-[var(--gutter)] text-mute md:w-44">{r.label}</p>
            <div className="relative flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
              <div data-track className="flex w-max gap-16 pr-16">
                {[...r.items, ...r.items, ...r.items, ...r.items].map((n, i) => (
                  <Wordmark key={i} name={n} i={i} />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="label container-x mt-8 text-paper/30">Partner names are placeholders for the demo</p>
    </section>
  )
}
