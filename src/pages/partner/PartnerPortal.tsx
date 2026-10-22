import { useEffect, useMemo, useState } from 'react'
import { MapPin } from 'lucide-react'
import { setSession, useDb, useSession } from '@/lib/db'
import { carRevenue, utilisation } from '@/lib/metrics'
import { addDays, fmtDateY, fmtDay, naira, startOfDay } from '@/lib/utils'
import { carName } from '@/mocks/cars'
import { effectiveStatus } from '@/services/fleet'
import { onTripCarIds, positionOf } from '@/services/tracking'
import { sm } from '@/data/images'
import { PortalShell } from '@/components/demo/PortalShell'
import { TableWrap, Td, Th } from '@/components/admin/kit'
import { Bars } from '@/components/admin/charts'
import { EmptyState, Panel, Pill, Progress, Stat } from '@/components/ui/misc'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'cars', label: 'My cars' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'payouts', label: 'Earnings & payouts' },
]

export default function PartnerPortal() {
  const session = useSession()
  const s = useDb((x) => x)
  const p = s.partners.find((x) => x.id === (session.partnerId ?? 'p-ibrahim'))!
  const [tab, setTab] = useState('overview')
  const [, tick] = useState(0)
  useEffect(() => {
    if (!session.partnerId) setSession({ partnerId: 'p-ibrahim' })
    const t = setInterval(() => tick((n) => n + 1), 3000)
    return () => clearInterval(t)
  }, [session.partnerId])

  const cars = s.cars.filter((c) => c.owner === p.id)
  const ids = new Set(cars.map((c) => c.id))
  const bookings = s.bookings.filter((b) => ids.has(b.carId) && b.status !== 'cancelled').sort((a, b) => +new Date(b.start) - +new Date(a.start))
  const share = 1 - p.commission
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const monthGross = bookings.filter((b) => new Date(b.start) >= monthStart).reduce((a, b) => a + b.total, 0)
  const onTrip = onTripCarIds(s)

  const months = useMemo(() => {
    const out: { month: string; earned: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const from = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1)
      const to = new Date(from.getFullYear(), from.getMonth() + 1, 0)
      const gross = bookings.filter((b) => new Date(b.start) >= from && new Date(b.start) <= to).reduce((a, b) => a + b.total, 0)
      out.push({ month: from.toLocaleDateString('en-GB', { month: 'short' }), earned: Math.round(gross * share) })
    }
    return out
  }, [bookings, share])

  return (
    <PortalShell portal="Partner owner portal" who={p.name} tabs={TABS} tab={tab} onTab={setTab}>
      {tab === 'overview' && (
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-bold">Welcome, {p.name.split(' ')[0]}</h1>
            <p className="text-[14px] text-mute">{cars.length} car{cars.length === 1 ? '' : 's'} listed · you keep {Math.round(share * 100)}% of every rental</p>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Your earnings this month" value={naira(Math.round(monthGross * share))} tone="accent" />
            <Stat label="Pending payout" value={naira(p.payoutPending)} sub="Paid on the 5th" />
            <Stat label="Paid to date" value={naira(p.paidOut)} />
            <Stat label="Utilisation (30d)" value={`${Math.round((cars.length ? cars.reduce((a, c) => a + utilisation(s, addDays(startOfDay(), -30), new Date(), c.id), 0) / cars.length : 0) * 100)}%`} />
          </div>
          <Panel title="Earnings, last 6 months"><Bars data={months} x="month" y="earned" height={220} /></Panel>
        </div>
      )}
      {tab === 'cars' && (
        cars.length ? (
          <ul className="grid gap-4 md:grid-cols-2">
            {cars.map((c) => {
              const st = effectiveStatus(c)
              const pos = positionOf(c, onTrip.has(c.id))
              const next = s.bookings.filter((b) => b.carId === c.id && ['confirmed', 'pending'].includes(b.status) && new Date(b.start) > new Date()).sort((a, b) => +new Date(a.start) - +new Date(b.start))[0]
              const u = utilisation(s, addDays(startOfDay(), -30), new Date(), c.id)
              return (
                <li key={c.id} className="border border-line bg-ink-2">
                  <img src={sm(c.image)} alt="" className="aspect-[16/9] w-full object-cover" />
                  <div className="p-4 text-[13.5px]">
                    <div className="flex items-center justify-between gap-2"><p className="font-semibold">{carName(c)} <span className="font-normal text-mute">{c.year}</span></p><Pill tone={st === 'rented' ? 'accent' : st === 'available' ? 'ok' : st === 'maintenance' ? 'warn' : 'bad'} className="capitalize" dot={st === 'rented'}>{st === 'rented' ? 'On a trip' : st}</Pill></div>
                    <p className="mt-2 flex items-center gap-1.5 text-mute"><MapPin className="size-3.5" />{pos.road}{pos.moving ? ` · ${pos.speed} km/h` : ''}</p>
                    <div className="mt-3 flex items-center gap-2 text-[12.5px]"><span className="w-28 text-mute">Utilisation 30d</span><Progress value={u * 100} /><span className="num w-9 text-right">{Math.round(u * 100)}%</span></div>
                    <p className="mt-2 text-[12.5px] text-mute">Lifetime earnings <span className="num text-paper">{naira(Math.round(carRevenue(s, c.id) * share))}</span> · {c.mileage.toLocaleString()} km</p>
                    <p className="mt-1 text-[12.5px] text-mute">{next ? `Next booking ${fmtDay(next.start)}` : 'No upcoming bookings yet'}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : <EmptyState title="No cars listed yet" body={p.pendingCar ? `Your ${p.pendingCar.year} ${p.pendingCar.make} ${p.pendingCar.model} is waiting for inspection. We’ll call you to book it.` : 'Apply on the website to list a car.'} />
      )}
      {tab === 'bookings' && (
        <TableWrap>
          <thead><tr><Th>Ref</Th><Th>Car</Th><Th>Dates</Th><Th>Status</Th><Th className="text-right">Rental</Th><Th className="text-right">Your share</Th></tr></thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id}>
                <Td className="num">{b.ref}</Td>
                <Td>{carName(s.cars.find((c) => c.id === b.carId)!)}</Td>
                <Td className="text-mute">{fmtDay(b.start)} → {fmtDay(b.end)}</Td>
                <Td><Pill tone={b.status === 'active' ? 'ok' : b.status === 'confirmed' ? 'accent' : 'mute'} className="capitalize">{b.status}</Pill></Td>
                <Td className="num text-right text-mute">{naira(b.total)}</Td>
                <Td className="num text-right">{naira(Math.round(b.total * share))}</Td>
              </tr>
            ))}
            {!bookings.length && <tr><Td className="text-mute">No bookings yet.</Td></tr>}
          </tbody>
        </TableWrap>
      )}
      {tab === 'payouts' && (
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <Panel title="Monthly earnings (your share)"><Bars data={months} x="month" y="earned" height={240} /></Panel>
          <Panel title="Payout history">
            <ul className="text-[13.5px]">
              <li className="flex justify-between border-b border-line py-2"><span>Next payout · {fmtDateY(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 5))}</span><span className="num text-accent">{naira(p.payoutPending)}</span></li>
              {months.slice(0, 5).reverse().map((m) => <li key={m.month} className="flex justify-between border-b border-line py-2"><span>{m.month} · bank transfer</span><span className="flex items-center gap-2"><span className="num">{naira(m.earned)}</span><Pill tone="ok">Paid</Pill></span></li>)}
            </ul>
            <p className="mt-3 text-[12.5px] text-mute">Commission {Math.round(p.commission * 100)}% covers tracking, verification, insurance admin, cleaning and customer support.</p>
          </Panel>
        </div>
      )}
    </PortalShell>
  )
}
