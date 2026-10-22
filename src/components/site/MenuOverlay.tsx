import { Link } from '@tanstack/react-router'
import { AnimatePresence, motion, type Variants } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { brand } from '@/config/brand'
import { waLink } from '@/lib/utils'
import { RollText } from '@/components/ui/button'
import { SocialIcons } from './SocialIcons'

export const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/fleet', label: 'Fleet' },
  { to: '/book', label: 'Book a car' },
  { to: '/business', label: 'Business' },
  { to: '/earn', label: 'Earn with your car' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
] as const

const ease = [0.76, 0, 0.24, 1] as const

const panel: Variants = {
  closed: { clipPath: 'inset(0 0 100% 0)', transition: { duration: 0.55, ease, delay: 0.15 } },
  open: { clipPath: 'inset(0 0 0% 0)', transition: { duration: 0.7, ease } },
}
const list: Variants = {
  open: { transition: { staggerChildren: 0.06, delayChildren: 0.28 } },
  closed: { transition: { staggerChildren: 0.035, staggerDirection: -1 } },
}
const item: Variants = {
  closed: { y: '110%', transition: { duration: 0.35, ease } },
  open: { y: '0%', transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
}
const foot: Variants = {
  closed: { opacity: 0, y: 12, transition: { duration: 0.2 } },
  open: { opacity: 1, y: 0, transition: { delay: 0.6, duration: 0.5 } },
}

/** Full-screen accent overlay menu with staggered reveal and a matching exit. */
export function MenuOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const firstLink = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const t = setTimeout(() => firstLink.current?.focus(), 450)
    return () => {
      window.removeEventListener('keydown', onKey)
      clearTimeout(t)
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          id="site-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          className="fixed inset-0 z-[70] overflow-y-auto bg-accent text-accent-ink"
          variants={panel}
          initial="closed"
          animate="open"
          exit="closed"
        >
          <div className="grid-lines on-paper" aria-hidden>
            {Array.from({ length: 6 }, (_, i) => <i key={i} />)}
          </div>
          <div className="container-x relative flex min-h-dvh flex-col pt-28 pb-8">
            <motion.ul variants={list} className="flex flex-1 flex-col items-start justify-center gap-1 md:items-center" onMouseLeave={() => setHovered(null)}>
              {NAV_LINKS.map((l, i) => (
                <li key={l.to} className="overflow-hidden">
                  <motion.div variants={item}>
                    <Link
                      ref={i === 0 ? firstLink : undefined}
                      to={l.to}
                      onClick={onClose}
                      onMouseEnter={() => setHovered(i)}
                      onFocus={() => setHovered(i)}
                      className="roll-host block font-display text-[clamp(34px,7.4vw,92px)] font-extrabold uppercase leading-[1.02] tracking-[-0.03em] transition-opacity duration-300 focus-visible:outline-accent-ink"
                      style={{ opacity: hovered === null || hovered === i ? 1 : 0.22 }}
                    >
                      <RollText>{l.label}</RollText>
                    </Link>
                  </motion.div>
                </li>
              ))}
            </motion.ul>
            <motion.div variants={foot} className="mt-10 flex flex-col gap-4 border-t border-accent-ink/15 pt-6 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-1 text-[15px] font-semibold md:flex-row md:gap-8">
                <a href={`tel:${brand.contact.phoneTel}`} className="hover:underline">{brand.contact.phoneDisplay}</a>
                <a href={waLink('Hi, I’d like to book a car')} target="_blank" rel="noreferrer" className="hover:underline">WhatsApp us</a>
                <a href={`mailto:${brand.contact.email}`} className="hover:underline">{brand.contact.email}</a>
              </div>
              <div className="flex items-center gap-4">
                <span className="label">{brand.cities.join(' / ')}</span>
                <SocialIcons className="-mr-2" />
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
