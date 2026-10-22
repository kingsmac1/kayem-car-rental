import { useNavigate, useRouterState } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Building2, Car, Globe, Handshake, LayoutDashboard, MonitorPlay, RotateCcw, X } from 'lucide-react'
import { brand } from '@/config/brand'
import { resetDemo, setSession } from '@/lib/db'
import { cn } from '@/lib/utils'

const PORTALS = [
  { to: '/', label: 'Customer website', note: 'Booking, verification, concierge', icon: Globe, match: (p: string) => !/^\/(admin|driver|corporate|partner)/.test(p) },
  { to: '/admin', label: 'Admin dashboard', note: 'Signed in as Owner', icon: LayoutDashboard, match: (p: string) => p.startsWith('/admin'), session: () => setSession({ staff: { name: brand.demoOwner.name, role: 'Owner' } }) },
  { to: '/driver', label: 'Chauffeur app', note: 'Sunday Okeke, Lagos', icon: Car, match: (p: string) => p.startsWith('/driver'), session: () => setSession({ chauffeurId: 'd-1' }) },
  { to: '/corporate', label: 'Corporate portal', note: 'Lekki Capital Partners', icon: Building2, match: (p: string) => p.startsWith('/corporate'), session: () => setSession({ corporateId: 'co-zenith' }) },
  { to: '/partner', label: 'Partner owner portal', note: 'Ibrahim Danladi', icon: Handshake, match: (p: string) => p.startsWith('/partner'), session: () => setSession({ partnerId: 'p-ibrahim' }) },
] as const

/** Corner switcher for pitches: jump between portals and reset demo data. */
export default function DemoSwitcher() {
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const navigate = useNavigate()
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setOpen(false)
    setConfirm(false)
  }, [pathname])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    const onDown = (e: PointerEvent) => panel.current && !panel.current.contains(e.target as Node) && setOpen(false)
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  const current = PORTALS.find((p) => p.match(pathname))

  return (
    // Bottom-left on the site (WhatsApp sits bottom-right); bottom-right in the admin (sidebar sits left).
    <div ref={panel} className={cn('fixed bottom-5 z-[96] font-body print:hidden md:bottom-6', pathname.startsWith('/admin') ? 'right-5 md:right-6' : 'left-5 md:left-6', pathname.startsWith('/driver') && 'bottom-24 md:bottom-6')}>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: 'bottom left' }}
            className={cn('absolute bottom-14 w-[min(300px,calc(100vw-40px))]', pathname.startsWith('/admin') ? 'right-0' : 'left-0', ' border border-line-strong bg-ink-2 text-paper shadow-[0_20px_50px_-12px_rgba(0,0,0,.8)]')}
            role="dialog"
            aria-label="Demo mode"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="text-[13px] font-semibold">Demo mode · {brand.shortName} Rental OS</p>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close demo menu" className="text-mute hover:text-paper"><X className="size-4" /></button>
            </div>
            <ul className="p-1.5">
              {PORTALS.map((p) => {
                const active = current?.to === p.to
                return (
                  <li key={p.to}>
                    <button
                      type="button"
                      onClick={() => {
                        if ('session' in p) p.session()
                        navigate({ to: p.to })
                        setOpen(false)
                      }}
                      className={cn('flex w-full items-center gap-3 rounded-[2px] px-2.5 py-2 text-left transition-colors', active ? 'bg-accent text-accent-ink' : 'hover:bg-paper/5')}
                    >
                      <p.icon className="size-4 shrink-0" />
                      <span>
                        <span className="block text-[13.5px] font-semibold">{p.label}</span>
                        <span className={cn('text-[12px]', active ? 'text-accent-ink/70' : 'text-mute')}>{p.note}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
            <div className="border-t border-line p-3">
              {confirm ? (
                <div className="flex flex-col gap-2 text-[12.5px]">
                  <p>Erase bookings, edits and logins made in this browser and restore fresh demo data?</p>
                  <div className="flex gap-2">
                    <button type="button" className="h-8 flex-1 rounded-[2px] bg-bad text-[12.5px] font-semibold text-ink" onClick={() => { resetDemo(); try { sessionStorage.clear() } catch { /* ignore */ } window.location.assign('/') }}>Reset now</button>
                    <button type="button" className="h-8 flex-1 rounded-[2px] border border-line text-[12.5px]" onClick={() => setConfirm(false)}>Keep data</button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirm(true)} className="flex w-full items-center justify-center gap-2 rounded-[2px] border border-line py-2 text-[12.5px] font-semibold hover:border-bad hover:text-bad">
                  <RotateCcw className="size-3.5" /> Reset demo data
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Demo mode: switch portal"
        className="flex h-11 items-center gap-2 rounded-full border border-line-strong bg-ink-2/90 pl-3 pr-4 text-[12.5px] font-semibold text-paper shadow-[0_10px_30px_-10px_rgba(0,0,0,.8)] backdrop-blur hover:border-accent"
      >
        <MonitorPlay className="size-4 text-accent" />
        <span className="hidden sm:inline">Demo</span>
        <span className="text-mute">· {current?.label.split(' ')[0] ?? 'Site'}</span>
      </button>
    </div>
  )
}
