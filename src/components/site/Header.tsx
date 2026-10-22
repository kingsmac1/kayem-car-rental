import { Link, useRouterState } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { gsap, ScrollTrigger } from '@/lib/gsap'
import { lockScroll } from '@/lib/smooth'
import { cn } from '@/lib/utils'
import { RollText } from '@/components/ui/button'
import { Logo } from './Logo'
import { MenuOverlay } from './MenuOverlay'
import { Magnetic } from './Magnetic'

const quick = [
  { to: '/fleet', label: 'Fleet' },
  { to: '/business', label: 'Business' },
  { to: '/earn', label: 'Earn' },
  { to: '/account', label: 'My trips' },
] as const

export function Header() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLElement>(null)
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  useEffect(() => {
    lockScroll(open)
  }, [open])
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Hide on scroll down, show on scroll up (scroll-driven → GSAP owns it).
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const st = ScrollTrigger.create({
      start: 120,
      end: 'max',
      onUpdate: (self) => gsap.to(el, { yPercent: self.direction === 1 ? -110 : 0, duration: 0.5, ease: 'power3.out', overwrite: true }),
      onLeaveBack: () => gsap.to(el, { yPercent: 0, duration: 0.4, overwrite: true }),
    })
    return () => st.kill()
  }, [])

  return (
    <>
      <header ref={ref} className="fixed inset-x-0 top-0 z-[75]">
        <div className="container-x flex h-[72px] items-center justify-between gap-4">
          <Link to="/" className="relative z-[76]" aria-label="Home">
            <Logo className={cn('transition-colors', open && 'text-accent-ink [&>span:first-child]:bg-accent-ink [&>span:first-child]:text-accent')} />
          </Link>
          <nav aria-label="Primary" className={cn('hidden items-center gap-8 lg:flex', open && 'invisible')}>
            {quick.map((l) => (
              <Link key={l.to} to={l.to} className="roll-host label text-paper/80 hover:text-paper [&.active]:text-accent" activeOptions={{ exact: false }}>
                <RollText>{l.label}</RollText>
              </Link>
            ))}
          </nav>
          <div className="relative z-[76] flex items-center gap-2">
            <Link
              to="/book"
              data-cursor="book"
              className={cn('roll-host label hidden h-10 items-center border border-line-strong px-4 transition-colors hover:border-accent hover:text-accent sm:inline-flex', open && 'invisible')}
            >
              <RollText>Book now</RollText>
            </Link>
            <Magnetic>
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls="site-menu"
                aria-label={open ? 'Close menu' : 'Open menu'}
                className={cn('group grid size-10 place-items-center transition-colors duration-300', open ? 'bg-accent-ink' : 'bg-accent')}
              >
                <span className="relative block h-3 w-4" aria-hidden>
                  <span className={cn('absolute left-0 h-[2px] w-4 transition-transform duration-500 [transition-timing-function:var(--ease-roll)]', open ? 'top-[5px] rotate-45 bg-accent' : 'top-0.5 bg-accent-ink')} />
                  <span className={cn('absolute left-0 h-[2px] w-4 transition-transform duration-500 [transition-timing-function:var(--ease-roll)]', open ? 'top-[5px] -rotate-45 bg-accent' : 'top-[8px] bg-accent-ink group-hover:scale-x-60 origin-left')} />
                </span>
              </button>
            </Magnetic>
          </div>
        </div>
      </header>
      <MenuOverlay open={open} onClose={() => setOpen(false)} />
    </>
  )
}
