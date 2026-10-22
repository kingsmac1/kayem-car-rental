import { useRef, type ElementType, type ReactNode } from 'react'
import { gsap, ScrollTrigger, SplitText, useGSAP } from '@/lib/gsap'
import { prefersReducedMotion } from '@/lib/env'
import { cn } from '@/lib/utils'

/** Headline that reveals line by line (masked) when it scrolls into view. */
export function SplitHeading({ as: Tag = 'h2', children, className, delay = 0, immediate }: { as?: ElementType; children: ReactNode; className?: string; delay?: number; immediate?: boolean }) {
  const ref = useRef<HTMLElement>(null)
  useGSAP(
    () => {
      const el = ref.current
      if (!el || prefersReducedMotion()) return
      let split: SplitText | undefined
      document.fonts.ready.then(() => {
        if (!ref.current) return
        split = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'split-line' })
        gsap.from(split.lines, {
          yPercent: 105,
          duration: 1.1,
          stagger: 0.09,
          delay,
          ease: 'expo.out',
          scrollTrigger: immediate ? undefined : { trigger: el, start: 'top 88%', once: true },
        })
      })
      return () => split?.revert()
    },
    { scope: ref },
  )
  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  )
}

/** Fades/slides direct children in as a batch when they enter the viewport. */
export function RevealGroup({ children, className, y = 28, as: Tag = 'div' }: { children: ReactNode; className?: string; y?: number; as?: ElementType }) {
  const ref = useRef<HTMLElement>(null)
  useGSAP(
    () => {
      const el = ref.current
      if (!el || prefersReducedMotion()) return
      const items = Array.from(el.children)
      gsap.set(items, { autoAlpha: 0, y })
      ScrollTrigger.batch(items, {
        start: 'top 92%',
        once: true,
        onEnter: (batch) => gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.08, ease: 'expo.out', overwrite: true }),
      })
    },
    { scope: ref },
  )
  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  )
}

/** Number that counts up once it is visible (or immediately). */
export function CountUp({ value, suffix = '', className, immediate, delay = 0, format = true }: { value: number; suffix?: string; className?: string; immediate?: boolean; delay?: number; format?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null)
  const fmt = (n: number) => (format ? Math.round(n).toLocaleString('en-NG') : String(Math.round(n)))
  useGSAP(() => {
    const el = ref.current
    if (!el) return
    if (prefersReducedMotion()) {
      el.textContent = fmt(value) + suffix
      return
    }
    const obj = { n: 0 }
    gsap.to(obj, {
      n: value,
      duration: value > 100 ? 2 : 1.4,
      delay,
      ease: 'power3.out',
      onUpdate: () => {
        el.textContent = fmt(obj.n) + suffix
      },
      scrollTrigger: immediate ? undefined : { trigger: el, start: 'top 90%', once: true },
    })
  })
  return (
    <span ref={ref} className={cn('num tabular-nums', className)}>
      {fmt(0)}
      {suffix}
    </span>
  )
}

/** Fine vertical column lines like a timing sheet. */
export function GridLines({ paper }: { paper?: boolean }) {
  return (
    <div className={cn('grid-lines', paper && 'on-paper')} aria-hidden>
      {Array.from({ length: 6 }, (_, i) => (
        <i key={i} />
      ))}
    </div>
  )
}
