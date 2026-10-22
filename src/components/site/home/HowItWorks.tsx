import { brand } from '@/config/brand'
import { useRef, useState } from 'react'
import { ChevronsRight } from 'lucide-react'
import { chapters } from '@/data/content'
import { sm } from '@/data/images'
import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap'
import { prefersReducedMotion } from '@/lib/env'
import { scrollToEl } from '@/lib/smooth'
import { cn } from '@/lib/utils'
import { RollText } from '@/components/ui/button'
import { useMedia, useReducedMotion } from '@/hooks/useMedia'

/** Sticky chapter scroll: the section pins while chapters and images swap. "1/3" counter + Skip. */
export function HowItWorks() {
  const root = useRef<HTMLElement>(null)
  const [active, setActive] = useState(0)
  const reduced = useReducedMotion()
  const desktop = useMedia('(min-width: 900px)') && !reduced

  useGSAP(
    () => {
      if (!desktop || prefersReducedMotion()) return
      const n = chapters.length
      const st = ScrollTrigger.create({
        trigger: root.current,
        start: 'top top',
        end: `+=${n * 85}%`,
        pin: '[data-pin]',
        scrub: true,
        onUpdate: (self) => setActive(Math.min(n - 1, Math.floor(self.progress * n * 0.999))),
      })
      // Progress bar.
      gsap.fromTo('[data-bar]', { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top top', end: `+=${n * 85}%`, scrub: true } })
      return () => st.kill()
    },
    { scope: root, dependencies: [desktop], revertOnUpdate: true },
  )

  const c = chapters[active]

  return (
    <section ref={root} id="how-it-works" className="relative bg-ink" aria-labelledby="how-title">
      {desktop ? (
        <div data-pin className="relative flex h-dvh flex-col overflow-hidden">
          <div className="container-x flex flex-1 flex-col pt-28 pb-10">
            <div className="flex items-end justify-between">
              <h2 id="how-title" className="display text-[clamp(28px,3.4vw,48px)] font-extrabold uppercase tracking-[-0.03em]">How {brand.shortName} works</h2>
              <p className="num text-[15px]" aria-live="polite">
                <span className="text-accent">{active + 1}</span>
                <span className="text-mute">/{chapters.length}</span>
              </p>
            </div>
            <div className="mt-4 h-px w-full bg-line">
              <div data-bar className="h-px origin-left bg-accent" />
            </div>
            <div className="grid flex-1 grid-cols-[1.25fr_1fr_1fr] items-center gap-10">
              <div className="relative h-[1.1em] overflow-hidden display text-[clamp(48px,5.6vw,96px)] font-extrabold uppercase tracking-[-0.045em]">
                {chapters.map((ch, i) => (
                  <span key={ch.n} className={cn('absolute inset-0 transition-transform duration-700 [transition-timing-function:var(--ease-out-expo)]', i === active ? 'translate-y-0' : i < active ? '-translate-y-full' : 'translate-y-full')} aria-hidden={i !== active}>
                    {ch.title}
                  </span>
                ))}
              </div>
              <div className="relative aspect-[4/5] max-h-[62vh] overflow-hidden">
                {chapters.map((ch, i) => (
                  <img
                    key={ch.n}
                    src={sm(ch.image)}
                    alt=""
                    loading="lazy"
                    className={cn('absolute inset-0 h-full w-full object-cover transition-[clip-path,transform] duration-[650ms] [transition-timing-function:var(--ease-out-expo)]', i <= active ? '[clip-path:inset(0_0_0_0)] scale-100' : '[clip-path:inset(100%_0_0_0)] scale-110')}
                  />
                ))}
                <span className="label absolute bottom-3 left-3 bg-ink px-2 py-1">{c.caption}</span>
              </div>
              <div className="flex flex-col gap-8">
                <p key={c.n} className="max-w-[38ch] text-[17px] leading-relaxed text-paper/85 animate-[fadeIn_.6s_ease-out]">{c.body}</p>
                <button type="button" onClick={() => scrollToEl('#services')} className="roll-host label inline-flex h-11 w-fit items-center gap-1.5 bg-accent px-4 text-accent-ink">
                  <RollText>Skip</RollText>
                  <ChevronsRight className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="container-x py-24">
          <h2 id="how-title" className="display text-[clamp(30px,8vw,48px)] font-extrabold uppercase tracking-[-0.03em]">How {brand.shortName} works</h2>
          <ol className="mt-10 flex flex-col gap-12">
            {chapters.map((ch) => (
              <li key={ch.n}>
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img src={sm(ch.image)} alt="" loading="lazy" className="h-full w-full object-cover" />
                  <span className="num absolute right-3 top-3 bg-ink px-2 py-1 text-[13px]">
                    <span className="text-accent">{ch.n}</span>/{chapters.length}
                  </span>
                </div>
                <h3 className="display mt-5 text-[32px] font-extrabold uppercase tracking-[-0.03em]">{ch.title}</h3>
                <p className="mt-3 text-paper/80">{ch.body}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  )
}
