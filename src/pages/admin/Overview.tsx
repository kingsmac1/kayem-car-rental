import { Link } from '@tanstack/react-router'
import { useMemo } from 'react'
import { ArrowRight, CalendarPlus, ClipboardCheck, Inbox, Radar } from 'lucide-react'
import { useDb, useSession } from '@/lib/db'
import { depositSummary, outstanding, revenueBetween, revenueByDay, todayOps, utilisation } from '@/lib/metrics'
import { seesMoney } from '@/lib/roles'
import { addDays, cn, fmtDay, fmtTime, naira, startOfDay, timeAgo } from '@/lib/utils'
import { carName } from '@/mocks/cars'
import { locationName } from '@/mocks/locations'
import { effectiveStatus } from '@/services/fleet'
import { AdminTitle, BookingStatus } from '@/components/admin/kit'
import { TrendChart } from '@/components/admin/charts'
import { Panel, Stat } from '@/components/ui/misc'
import { Button } from '@/components/ui/button'

export default function Overview() {
  const s = useDb((x) => x)
  const role = useSession().staff!.role
  const money = seesMoney(role)
  const now = new Date()
  const today = startOfDay(now)

  const m = useMemo(() => {
    const ops = todayOps(s, now)
    const weekStart = addDays(today, -((today.getDay() + 6) % 7))
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const trend = revenueByDay(s, addDays(today, -29), today).map((d) => ({ ...d, label: fmtDay(d.date).replace(/^\w+ /, '') }))
    const statusCounts = s.cars.reduce<Record<string, number>>((acc, c) => {
      const st = effectiveStatus(c)
      acc[st] = (acc[st] ?? 0) + 1
      return acc
    }, {})
    return {
      ops,
      revToday: revenueBetween(s, today, today),
      revWeek: revenueBetween(s, weekStart, today),
      revMonth: revenueBetween(s, monthStart, today),
      owed: outstanding(s).filter((o) => ['confirmed', 'active', 'returned'].includes(o.booking.status)),
      util: utilisation(s, addDays(today, -30), now),
      trend,
      statusCounts,
      deposits: depositSummary(s),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s])

  const schedule = [
    ...m.ops.pickupsToday.map((b) => ({ b, kind: 'Pick-up' as const, at: b.start })),
    ...m.ops.dueBack.map((b) => ({ b, kind: 'Return' as const, at: b.end })),
  ].sort((a, b) => +new Date(a.at) - +new Date(b.at))

  const carOf = (id: string) => s.cars.find((c) => c.id === id)!
  const custOf = (id: string) => s.customers.find((c) => c.id === id)
  const waiting = s.conversations.filter((c) => c.status === 'needs-human').length

  return (
    <div>
      <AdminTitle title={`Good ${now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening'}`} sub={`${fmtDay(now)} · here’s the business at a glance`}>
        <Button size="app" asChild icon={<CalendarPlus className="size-4" />}>
          <Link to="/admin/bookings" search={{ new: '1' }}>New booking</Link>
        </Button>
      </AdminTitle>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Pick-ups today" value={m.ops.pickupsToday.length} sub={`${m.ops.pickupsToday.filter((b) => b.status === 'pending').length} still pending`} />
        <Stat label="Cars out now" value={m.ops.carsOut.length} sub={`of ${s.cars.length} in the fleet`} />
        <Stat label="Due back today" value={m.ops.dueBack.length} />
        <Stat label="Overdue" value={m.ops.overdue.length} tone={m.ops.overdue.length ? 'bad' : undefined} sub={m.ops.overdue.length ? 'Needs a call now' : 'All on time'} />
        {money && (
          <>
            <Stat label="Revenue today" value={naira(m.revToday)} tone="accent" />
            <Stat label="This week" value={naira(m.revWeek)} />
            <Stat label="This month" value={naira(m.revMonth)} />
            <Stat label="Payments outstanding" value={naira(m.owed.reduce((a, o) => a + o.due, 0))} tone={m.owed.length ? 'warn' : undefined} sub={`${m.owed.length} booking${m.owed.length === 1 ? '' : 's'}`} />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        {money ? (
          <Panel title="Revenue, last 30 days" action={<Link to="/admin/finance" className="text-[12.5px] text-mute hover:text-paper">Finance →</Link>}>
            <TrendChart data={m.trend} x="label" y="revenue" />
          </Panel>
        ) : (
          <Panel title="Today’s schedule">
            <Schedule schedule={schedule} carOf={carOf} custOf={custOf} />
          </Panel>
        )}
        <Panel title="Fleet right now" action={<span className="num text-[12.5px] text-mute">{Math.round(m.util * 100)}% utilised (30d)</span>}>
          <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-[2px]" role="img" aria-label="Fleet status split">
            {(['rented', 'available', 'maintenance', 'blocked'] as const).map((k) => (
              <span key={k} className={cn('h-full', { rented: 'bg-accent', available: 'bg-ok', maintenance: 'bg-warn', blocked: 'bg-bad' }[k])} style={{ width: `${((m.statusCounts[k] ?? 0) / s.cars.length) * 100}%` }} />
            ))}
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-[13.5px]">
            {(['rented', 'available', 'maintenance', 'blocked'] as const).map((k) => (
              <div key={k} className="flex items-center justify-between border border-line px-3 py-2">
                <dt className="flex items-center gap-2 capitalize"><span className={cn('size-2 rounded-full', { rented: 'bg-accent', available: 'bg-ok', maintenance: 'bg-warn', blocked: 'bg-bad' }[k])} />{k}</dt>
                <dd className="num">{m.statusCounts[k] ?? 0}</dd>
              </div>
            ))}
          </dl>
          {money && (
            <p className="mt-4 text-[12.5px] text-mute">
              Deposits held <span className="num text-paper">{naira(m.deposits.held)}</span>
            </p>
          )}
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        {money && (
          <Panel title="Today’s schedule" className="xl:col-span-1">
            <Schedule schedule={schedule} carOf={carOf} custOf={custOf} />
          </Panel>
        )}
        <Panel title="Overdue & attention" className={money ? '' : 'xl:col-span-2'}>
          {m.ops.overdue.length ? (
            <ul className="flex flex-col gap-2">
              {m.ops.overdue.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 border border-bad/30 bg-bad/5 px-3 py-2.5 text-[13.5px]">
                  <span>
                    <span className="font-semibold">{carName(carOf(b.carId))}</span>
                    <span className="block text-mute">{custOf(b.customerId)?.name} · due {fmtDay(b.end)} {fmtTime(b.end)}</span>
                  </span>
                  <BookingStatus status={b.status} overdue />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13.5px] text-mute">Nothing overdue. 👌</p>
          )}
          {m.owed.length > 0 && money ? (
            <>
              <p className="mt-5 text-xs font-semibold text-mute">Unpaid balances</p>
              <ul className="mt-2 flex flex-col">
                {m.owed.slice(0, 4).map(({ booking: b, due }) => (
                  <li key={b.id} className="flex justify-between border-b border-line py-2 text-[13.5px]"><span><span className="num">{b.ref}</span> · {custOf(b.customerId)?.name}</span><span className="num text-warn">{naira(due)}</span></li>
                ))}
              </ul>
            </>
          ) : null}
        </Panel>
        <Panel title="Alerts" action={<Link to="/admin/command" className="text-[12.5px] text-mute hover:text-paper">Command →</Link>}>
          <ul className="flex flex-col">
            {s.alerts.slice(0, 6).map((a) => (
              <li key={a.id} className="flex gap-2.5 border-b border-line py-2.5 text-[13px] last:border-0">
                <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', a.level === 'bad' ? 'bg-bad' : a.level === 'warn' ? 'bg-warn' : 'bg-mute')} aria-label={a.level} />
                <span className="flex-1">{a.text}<span className="mt-0.5 block text-[11.5px] text-mute">{timeAgo(a.at)}</span></span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="Quick actions" className="mt-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { to: '/admin/bookings', label: 'Create a booking', icon: CalendarPlus, note: 'Walk-in or phone' },
            { to: '/admin/inspections', label: 'Start a check-in', icon: ClipboardCheck, note: `${m.ops.dueBack.length} returns today` },
            { to: '/admin/command', label: 'Open Fleet Command', icon: Radar, note: `${m.ops.carsOut.length} cars moving` },
            { to: '/admin/inbox', label: 'Reply on WhatsApp', icon: Inbox, note: waiting ? `${waiting} waiting for a human` : 'All handled by the bot' },
          ].map((q) => (
            <Link key={q.label} to={q.to} className="group flex items-center gap-3 border border-line px-4 py-3 transition-colors hover:border-accent">
              <q.icon className="size-5 text-accent" />
              <span className="flex-1">
                <span className="block text-[14px] font-semibold">{q.label}</span>
                <span className="text-[12.5px] text-mute">{q.note}</span>
              </span>
              <ArrowRight className="size-4 text-mute transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </Panel>
    </div>
  )
}

function Schedule({ schedule, carOf, custOf }: { schedule: { b: import('@/mocks/types').Booking; kind: 'Pick-up' | 'Return'; at: string }[]; carOf: (id: string) => import('@/mocks/types').Car; custOf: (id: string) => import('@/mocks/types').Customer | undefined }) {
  if (!schedule.length) return <p className="text-[13.5px] text-mute">No pick-ups or returns left today.</p>
  return (
    <ul className="flex flex-col">
      {schedule.map(({ b, kind, at }) => (
        <li key={b.id + kind} className="grid grid-cols-[56px_1fr_auto] items-center gap-3 border-b border-line py-2.5 text-[13.5px] last:border-0">
          <span className="num text-mute">{fmtTime(at)}</span>
          <span className="min-w-0">
            <span className="block truncate font-semibold">{carName(carOf(b.carId))}</span>
            <span className="block truncate text-[12.5px] text-mute">{custOf(b.customerId)?.name} · {locationName(kind === 'Pick-up' ? b.pickup : b.dropoff)}</span>
          </span>
          <span className={cn('rounded-[2px] px-2 py-0.5 text-[11.5px] font-semibold', kind === 'Pick-up' ? 'bg-accent/15 text-accent' : 'bg-ok/15 text-ok')}>{kind}</span>
        </li>
      ))}
    </ul>
  )
}
