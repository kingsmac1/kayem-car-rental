import { Link, Navigate, Outlet, useRouterState } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  BarChart3, Bell, Bot, Building2, CalendarRange, Car, ClipboardCheck, Cog, Handshake, Inbox, LayoutDashboard, Lock, LogOut, Megaphone, Menu, Radar, Tag, UserRound, Users, Wrench,
} from 'lucide-react'
import { brand } from '@/config/brand'
import { clearSession, db, setSession, useDb, useSession } from '@/lib/db'
import { canAccess, ROLES, ROLE_INFO } from '@/lib/roles'
import { cn, timeAgo } from '@/lib/utils'
import type { StaffRole } from '@/mocks/types'
import { Select } from '@/components/ui/input'

const NAV = [
  { group: 'Operate', items: [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard },
    { to: '/admin/bookings', label: 'Bookings', icon: CalendarRange },
    { to: '/admin/command', label: 'Fleet Command', icon: Radar },
    { to: '/admin/inbox', label: 'WhatsApp inbox', icon: Inbox },
  ] },
  { group: 'Fleet', items: [
    { to: '/admin/fleet', label: 'Cars', icon: Car },
    { to: '/admin/inspections', label: 'Inspections', icon: ClipboardCheck },
    { to: '/admin/maintenance', label: 'Maintenance & docs', icon: Wrench },
  ] },
  { group: 'People', items: [
    { to: '/admin/customers', label: 'Customers', icon: Users },
    { to: '/admin/chauffeurs', label: 'Chauffeurs', icon: UserRound },
    { to: '/admin/corporate', label: 'Corporate', icon: Building2 },
    { to: '/admin/partners', label: 'Partner owners', icon: Handshake },
  ] },
  { group: 'Business', items: [
    { to: '/admin/finance', label: 'Finance', icon: BarChart3 },
    { to: '/admin/pricing', label: 'Pricing rules', icon: Tag },
    { to: '/admin/analyst', label: 'AI analyst', icon: Bot },
    { to: '/admin/marketing', label: 'Marketing', icon: Megaphone },
    { to: '/admin/settings', label: 'Settings', icon: Cog },
  ] },
] as const

export default function AdminLayout() {
  const session = useSession()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const [navOpen, setNavOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const alerts = useDb((s) => s.alerts)
  const unread = alerts.filter((a) => !a.read).length
  const inboxWaiting = useDb((s) => s.conversations.filter((c) => c.status === 'needs-human').length)

  useEffect(() => {
    setNavOpen(false)
  }, [pathname])
  useEffect(() => {
    document.title = `Admin · ${brand.name}`
  }, [])

  if (!session.staff) return <Navigate to="/admin/login" />
  const role = session.staff.role
  const allowed = canAccess(role, pathname)

  const sidebar = (
    <nav aria-label="Admin" className="flex h-full flex-col">
      <Link to="/admin" className="flex items-center gap-2.5 px-4 py-4">
        <span className="grid size-8 place-items-center bg-accent font-display text-[16px] font-extrabold text-accent-ink">{brand.monogram}</span>
        <span>
          <span className="block text-[14px] font-bold leading-tight">{brand.shortName} Rental OS</span>
          <span className="text-[11.5px] text-mute">Admin</span>
        </span>
      </Link>
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {NAV.map((g) => (
          <div key={g.group} className="mt-4">
            <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-mute/80">{g.group}</p>
            <ul className="flex flex-col gap-0.5">
              {g.items.map((it) => {
                const ok = canAccess(role, it.to)
                const active = it.to === '/admin' ? pathname === '/admin' || pathname === '/admin/' : pathname.startsWith(it.to)
                return (
                  <li key={it.to}>
                    <Link
                      to={it.to}
                      className={cn(
                        'flex items-center gap-2.5 rounded-[2px] px-2.5 py-2 text-[13.5px] font-medium transition-colors',
                        active ? 'bg-accent text-accent-ink' : ok ? 'text-paper/80 hover:bg-paper/5 hover:text-paper' : 'text-paper/30',
                      )}
                    >
                      <it.icon className="size-4 shrink-0" />
                      <span className="flex-1">{it.label}</span>
                      {!ok && <Lock className="size-3" aria-label="No access for this role" />}
                      {it.to === '/admin/inbox' && inboxWaiting > 0 && ok ? <span className={cn('rounded-full px-1.5 text-[11px] font-bold', active ? 'bg-ink text-accent' : 'bg-bad text-ink')}>{inboxWaiting}</span> : null}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line p-3 text-[12px] text-mute">
        <Link to="/" className="hover:text-paper">← Customer website</Link>
      </div>
    </nav>
  )

  return (
    <div className="min-h-dvh bg-ink font-body text-paper">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-line bg-ink-2 lg:block">{sidebar}</aside>
      {navOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin navigation">
          <button type="button" className="absolute inset-0 bg-black/60" aria-label="Close menu" onClick={() => setNavOpen(false)} />
          <aside className="relative h-full w-72 border-r border-line bg-ink-2">{sidebar}</aside>
        </div>
      )}
      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-ink/90 px-4 backdrop-blur md:px-6">
          <button type="button" className="grid size-9 place-items-center lg:hidden" onClick={() => setNavOpen(true)} aria-label="Open navigation">
            <Menu className="size-5" />
          </button>
          <div className="flex-1" />
          <label className="hidden items-center gap-2 text-[12.5px] text-mute sm:flex">
            Viewing as
            <Select
              compact
              value={role}
              onChange={(e) => setSession({ staff: { name: db.get().staff.find((s) => s.role === e.target.value)?.name ?? session.staff!.name, role: e.target.value as StaffRole } })}
              className="w-40"
              aria-label="Switch role"
            >
              {ROLES.map((r) => <option key={r}>{r}</option>)}
            </Select>
          </label>
          <div className="relative">
            <button type="button" onClick={() => setBellOpen((o) => !o)} className="relative grid size-9 place-items-center rounded-[2px] hover:bg-paper/5" aria-label={`Alerts, ${unread} unread`} aria-expanded={bellOpen}>
              <Bell className="size-[18px]" />
              {unread > 0 && <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-bad px-1 text-[10px] font-bold text-ink">{unread}</span>}
            </button>
            {bellOpen && (
              <div className="absolute right-0 top-11 z-50 w-[min(360px,calc(100vw-32px))] border border-line bg-ink-2 shadow-[0_12px_32px_-8px_rgba(0,0,0,.6)]">
                <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                  <p className="text-[13px] font-semibold">Alerts</p>
                  <button type="button" className="text-[12px] text-mute hover:text-paper" onClick={() => db.set((d) => { d.alerts.forEach((a) => { a.read = true }) })}>Mark all read</button>
                </div>
                <ul className="max-h-96 overflow-y-auto">
                  {alerts.slice(0, 12).map((a) => (
                    <li key={a.id} className={cn('border-b border-line px-4 py-3 text-[13px]', !a.read && 'bg-paper/[0.03]')}>
                      <p className="flex items-start gap-2"><span className={cn('mt-1.5 size-1.5 shrink-0 rounded-full', a.level === 'bad' ? 'bg-bad' : a.level === 'warn' ? 'bg-warn' : 'bg-mute')} />{a.text}</p>
                      <p className="mt-1 pl-3.5 text-[11.5px] text-mute">{timeAgo(a.at)}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 border-l border-line pl-3">
            <span className="grid size-8 place-items-center rounded-full bg-paper/10 text-[12px] font-bold">{session.staff.name.split(' ').map((p) => p[0]).join('')}</span>
            <span className="hidden text-[12.5px] leading-tight md:block">
              <span className="block font-semibold">{session.staff.name}</span>
              <span className="text-mute">{role}</span>
            </span>
            <button type="button" onClick={() => clearSession('staff')} className="grid size-8 place-items-center text-mute hover:text-paper" aria-label="Log out">
              <LogOut className="size-4" />
            </button>
          </div>
        </header>
        <main className="px-4 py-6 md:px-6 md:py-8">
          {allowed ? (
            <Outlet />
          ) : (
            <div className="mx-auto mt-16 max-w-md border border-line bg-ink-2 p-8 text-center">
              <Lock className="mx-auto size-8 text-mute" />
              <h1 className="mt-4 text-lg font-semibold">{role} can’t open this page</h1>
              <p className="mt-2 text-[14px] text-mute">{ROLE_INFO[role]}</p>
              <p className="mt-4 text-[13px] text-mute">Switch to <span className="text-paper">Owner</span> in “Viewing as” to see it.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
