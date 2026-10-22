import { brand } from '@/config/brand'
import { useRef } from 'react'
import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap'
import { prefersReducedMotion } from '@/lib/env'
import { images, sm } from '@/data/images'
import { pillars } from '@/data/content'
import { GridLines } from '../Reveal'

const WORDS = 'We check every driver, track every car and photograph every handover, so the only thing you think about is the road ahead.'
const HIGHLIGHT = new Set(['check', 'every', 'driver,', 'track', 'car', 'photograph', 'handover,', 'road', 'ahead.'])

/** "Why Emkay": scrubbed manifesto (words fill in as you scroll) + the four promises. */
export function Manifesto() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      const words = gsap.utils.toArray<HTMLElement>('[data-word]')
      gsap.fromTo(
        words,
        { opacity: 0.14 },
        { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: '[data-manifesto]', start: 'top 78%', end: 'bottom 45%', scrub: 0.6 } },
      )
      gsap.utils.toArray<HTMLElement>('[data-float]').forEach((el) => {
        gsap.fromTo(el, { yPercent: Number(el.dataset.float) }, { yPercent: -Number(el.dataset.float), ease: 'none', scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: true } })
      })
      ScrollTrigger.refresh()
    },
    { scope: root },
  )

  return (
    <section ref={root} id="why" className="relative overflow-hidden bg-paper text-ink" aria-labelledby="why-title">
      <GridLines paper />
      <div className="container-x relative py-24 md:py-36">
        <h2 id="why-title" className="label text-ink/60">Why {brand.shortName}</h2>
        <img data-float="30" src={sm(images.scenes.headlight)} alt="" loading="lazy" className="absolute left-[var(--gutter)] top-[52%] hidden w-[10vw] max-w-44 grayscale lg:block" />
        <img data-float="60" src={sm(images.scenes.mercWheel)} alt="" loading="lazy" className="absolute right-[var(--gutter)] top-[6%] hidden w-[10vw] max-w-40 lg:block" />
        <p data-manifesto className="display relative z-10 mx-auto mt-10 max-w-[19ch] text-center text-[clamp(30px,5vw,72px)] font-extrabold uppercase leading-[1.02] tracking-[-0.035em]">
          {WORDS.split(' ').map((w, i) => (
            <span key={i} data-word className={HIGHLIGHT.has(w) ? 'text-ink' : 'text-ink/55'}>
              {w}{' '}
            </span>
          ))}
        </p>

        <ol className="mt-24 grid border-t border-ink/15 md:mt-32 md:grid-cols-2">
          {pillars.map((p, i) => (
            <li key={p.title} className={`grid gap-4 border-b border-ink/15 py-8 md:py-10 ${i % 2 === 0 ? 'md:border-r md:pr-10' : 'md:pl-10'}`}>
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="display text-[clamp(22px,2.4vw,32px)] font-bold tracking-[-0.02em]">{p.title}</h3>
                <span className="num shrink-0 text-[13px] text-ink/50">0{i + 1}</span>
              </div>
              <p className="max-w-[46ch] text-[16px] leading-relaxed text-ink/75">{p.body}</p>
              <p className="label w-fit bg-ink px-2.5 py-1.5 text-accent">{p.detail}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
