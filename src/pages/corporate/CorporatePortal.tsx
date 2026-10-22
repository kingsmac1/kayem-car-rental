import { useEffect, useMemo, useState } from 'react'
import { Download, Plus, Printer, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { brand } from '@/config/brand'
import { db, setSession, useDb, useSession } from '@/lib/db'
import { billable } from '@/lib/metrics'
import { quote } from '@/lib/pricing'
import { addDays, cn, downloadCsv, fmtDateY, fmtDay, fmtTime, isoDate, naira } from '@/lib/utils'
import { carName } from '@/mocks/cars'
import { locationName, locations } from '@/mocks/locations'
import { bookingService, BookingConflictError } from '@/services/bookings'
import { bookability, overlaps } from '@/services/fleet'
import { PortalShell } from '@/components/demo/PortalShell'
import { TableWrap, Td, Th } from '@/components/admin/kit'
import { Button } from '@/components/ui/button'
import { AppField, Input, Select } from '@/components/ui/input'
import { EmptyState, Panel, Pill, Progress, Stat } from '@/components/ui/misc'

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'book', label: 'Book a car' },
  { id: 'trips', label: 'Trips' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'bookers', label: 'Staff bookers' },
]

export default function CorporatePortal() {
  const session = useSession()
  const s = useDb((x) => x)
  const co = s.corporates.find((c) => c.id === (session.corporateId ?? 'co-zenith'))!
  const [tab, setTab] = useState('dashboard')
  useEffect(() => {
    if (!session.corporateId) setSession({ corporateId: 'co-zenith' })
  }, [session.corporateId])

  const trips = useMemo(() => billable(s).filter((b) => b.corporateId === co.id).sort((a, b) => +new Date(b.start) - +new Date(a.start)), [s, co.id])
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const monthSpend = trips.filter((b) => new Date(b.start) >= monthStart).reduce((a, b) => a + b.total, 0)
  const upcoming = trips.filter((b) => ['pending', 'confirmed', 'active'].includes(b.status)).reverse()

  return (
    <PortalShell portal="Corporate portal" who={`${co.contact} · ${co.name}`} tabs={TABS} tab={tab} onTab={setTab}>
      {tab === 'dashboard' && (
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-bold">{co.name}</h1>
            <p className="text-[14px] text-mute">{co.kind} account · corporate rate −{Math.round(co.discount * 100)}% · billed monthly</p>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Spend this month" value={naira(monthSpend)} tone="accent" />
            <Stat label="Trips (all time)" value={trips.length} />
            <Stat label="Upcoming / live" value={upcoming.length} />
            <div className="border border-line bg-ink-2 p-4">
              <p className="text-xs font-semibold text-mute">Credit used</p>
              <p className="num mt-2 text-[19px]">{naira(co.balance)}</p>
              <Progress value={(co.balance / co.creditLimit) * 100} className="mt-2" tone={co.balance / co.creditLimit > 0.8 ? 'bad' : 'ok'} />
              <p className="mt-1 text-xs text-mute">of {naira(co.creditLimit)}</p>
            </div>
          </div>
          <Panel title="Upcoming and live trips" action={<Button size="appSm" onClick={() => setTab('book')} icon={<Plus className="size-3.5" />}>Book a car</Button>}>
            {upcoming.length ? (
              <ul>{upcoming.map((b) => <TripLine key={b.id} id={b.id} />)}</ul>
            ) : <EmptyState title="No upcoming trips" body="Book a car for a colleague or a visiting guest." />}
          </Panel>
        </div>
      )}
      {tab === 'book' && <BookForStaff coId={co.id} onDone={() => setTab('trips')} />}
      {tab === 'trips' && (
        <TableWrap>
          <thead><tr><Th>Ref</Th><Th>Traveller</Th><Th>Car</Th><Th>Dates</Th><Th>Status</Th><Th className="text-right">Amount</Th></tr></thead>
          <tbody>
            {trips.map((b) => (
              <tr key={b.id}>
                <Td className="num">{b.ref}</Td>
                <Td>{s.customers.find((c) => c.id === b.customerId)?.name}</Td>
                <Td>{carName(s.cars.find((c) => c.id === b.carId)!)}</Td>
                <Td className="text-mute">{fmtDay(b.start)} → {fmtDay(b.end)}</Td>
                <Td><Pill tone={b.status === 'active' ? 'ok' : b.status === 'confirmed' ? 'accent' : b.status === 'pending' ? 'warn' : 'mute'} className="capitalize">{b.status}</Pill></Td>
                <Td className="num text-right">{naira(b.total)}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
      {tab === 'invoices' && <Invoices coId={co.id} />}
      {tab === 'bookers' && <Bookers coId={co.id} />}
    </PortalShell>
  )
}

function TripLine({ id }: { id: string }) {
  const s = useDb((x) => x)
  const b = s.bookings.find((x) => x.id === id)!
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3 text-[13.5px] last:border-0">
      <span><span className="font-semibold">{s.customers.find((c) => c.id === b.customerId)?.name}</span> · {carName(s.cars.find((c) => c.id === b.carId)!)}<span className="block text-[12.5px] text-mute">{fmtDay(b.start)} {fmtTime(b.start)} · {locationName(b.pickup)}{b.mode === 'chauffeur' ? ' · with chauffeur' : ''}</span></span>
      <Pill tone={b.status === 'active' ? 'ok' : 'accent'} className="capitalize" dot={b.status === 'active'}>{b.status === 'active' ? 'On trip' : b.status}</Pill>
    </li>
  )
}

function BookForStaff({ coId, onDone }: { coId: string; onDone: () => void }) {
  const s = useDb((x) => x)
  const co = s.corporates.find((c) => c.id === coId)!
  const [traveller, setTraveller] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState<string>(co.city)
  const [carId, setCarId] = useState('')
  const [start, setStart] = useState(isoDate(addDays(new Date(), 1)))
  const [end, setEnd] = useState(isoDate(addDays(new Date(), 2)))
  const [pickup, setPickup] = useState('')
  const [chauffeur, setChauffeur] = useState(true)
  const [saving, setSaving] = useState(false)
  const sd = new Date(`${start}T09:00:00`)
  const ed = new Date(`${end}T18:00:00`)
  const cars = s.cars.filter((c) => c.city === city && bookability(c).ok)
  const car = s.cars.find((c) => c.id === carId)
  const free = car && ed > sd ? overlaps(s, car.id, sd, ed).length === 0 : false
  const q = car && ed > sd ? quote({ car, start: sd, end: ed, mode: chauffeur || car.modes.length === 1 ? 'chauffeur' : 'self-drive', extras: [], rules: { ...s.pricing, corporateDiscount: co.discount }, corporate: true }) : null
  const locs = locations.filter((l) => l.city === city)

  const submit = async () => {
    if (!traveller.trim() || !car || !q || !free) return
    setSaving(true)
    try {
      const custId = `c-${Date.now()}`
      db.set((d) => {
        d.customers.unshift({ id: custId, name: traveller.trim(), phone: phone || '+234 800 000 0000', email: `${traveller.trim().toLowerCase().replace(/\s+/g, '.')}@guest.${co.email.split('@')[1]}`, city: city as typeof co.city, verification: 'verified', risk: 'low', riskFlags: [], notes: [`Booked by ${co.name}`], corporateId: co.id, joined: new Date().toISOString(), referralCode: 'CORP', points: 0 })
      })
      const b = await bookingService.create({ carId: car.id, customerId: custId, start: sd.toISOString(), end: ed.toISOString(), pickup: pickup || locs[0].id, dropoff: pickup || locs[0].id, mode: chauffeur || car.modes.length === 1 ? 'chauffeur' : 'self-drive', extras: [], status: 'confirmed', total: q.total, paid: 0, deposit: 0, depositStatus: 'pending', channel: 'corporate', corporateId: co.id })
      db.set((d) => {
        const c = d.corporates.find((x) => x.id === co.id)
        if (c) c.balance += q.total
      })
      toast.success(`${b.ref} booked for ${traveller} — billed to your account`)
      onDone()
    } catch (e) {
      toast.error(e instanceof BookingConflictError ? e.message : 'Could not book')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <Panel title="Book a car for staff or a guest">
        <div className="grid gap-4 sm:grid-cols-2">
          <AppField label="Traveller name" htmlFor="cb-t"><Input compact id="cb-t" value={traveller} onChange={(e) => setTraveller(e.target.value)} placeholder="e.g. Mr. Daniel Okon" /></AppField>
          <AppField label="Traveller phone" htmlFor="cb-p"><Input compact id="cb-p" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0803 123 4567" /></AppField>
          <AppField label="City" htmlFor="cb-c"><Select compact id="cb-c" value={city} onChange={(e) => { setCity(e.target.value); setCarId(''); setPickup('') }}>{brand.cities.map((c) => <option key={c}>{c}</option>)}</Select></AppField>
          <AppField label="Pick-up point" htmlFor="cb-pu"><Select compact id="cb-pu" value={pickup || locs[0]?.id} onChange={(e) => setPickup(e.target.value)}>{locs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</Select></AppField>
          <AppField label="From" htmlFor="cb-s"><Input compact id="cb-s" type="date" value={start} min={isoDate(new Date())} onChange={(e) => setStart(e.target.value)} className="[color-scheme:dark]" /></AppField>
          <AppField label="To" htmlFor="cb-e"><Input compact id="cb-e" type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} className="[color-scheme:dark]" /></AppField>
          <AppField label="Car" htmlFor="cb-car" className="sm:col-span-2">
            <Select compact id="cb-car" value={carId} onChange={(e) => setCarId(e.target.value)}>
              <option value="">Choose a car…</option>
              {cars.map((c) => <option key={c.id} value={c.id}>{carName(c)} · {naira(Math.round(c.rates.daily * (1 - co.discount)))}/day{ed > sd && overlaps(s, c.id, sd, ed).length ? ' — booked' : ''}</option>)}
            </Select>
          </AppField>
          <label className="flex items-center gap-2 text-[13.5px] sm:col-span-2"><input type="checkbox" className="accent-[var(--brand-accent)]" checked={chauffeur} onChange={(e) => setChauffeur(e.target.checked)} />Include a chauffeur (recommended for guests)</label>
        </div>
        {car && !free && <p className="mt-3 text-[13.5px] text-bad">That car is booked for part of those dates.</p>}
        <Button size="app" className="mt-4" disabled={!traveller.trim() || !car || !free} loading={saving} onClick={submit}>Book and bill to account</Button>
      </Panel>
      <Panel title="Summary">
        {q && car ? (
          <ul className="flex flex-col gap-2 text-[13.5px]">
            {q.lines.map((l) => <li key={l.label} className="flex justify-between gap-3"><span>{l.label}</span><span className={cn('num', l.amount < 0 && 'text-ok')}>{naira(l.amount)}</span></li>)}
            <li className="mt-1 flex justify-between border-t border-line pt-2 font-semibold"><span>Billed to {co.name}</span><span className="num">{naira(q.total)}</span></li>
            <li className="text-[12px] text-mute">No deposit on corporate accounts. Added to this month’s invoice.</li>
          </ul>
        ) : <p className="text-[13.5px] text-mute">Choose a car and dates to see the price at your corporate rate.</p>}
      </Panel>
    </div>
  )
}

function Invoices({ coId }: { coId: string }) {
  const s = useDb((x) => x)
  const co = s.corporates.find((c) => c.id === coId)!
  const trips = billable(s).filter((b) => b.corporateId === coId)
  const months = new Map<string, typeof trips>()
  for (const b of trips) {
    const k = new Date(b.start).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    months.set(k, [...(months.get(k) ?? []), b])
  }
  const list = [...months.entries()].sort((a, b) => +new Date(b[1][0].start) - +new Date(a[1][0].start))
  return (
    <div className="flex flex-col gap-4">
      {list.map(([m, items], i) => {
        const total = items.reduce((a, b) => a + b.total, 0)
        return (
          <Panel key={m} title={`${m} · INV-${co.id.slice(3, 6).toUpperCase()}-${String(list.length - i).padStart(3, '0')}`} action={<Pill tone={i === 0 ? 'warn' : 'ok'}>{i === 0 ? 'Open — due on the 5th' : 'Paid'}</Pill>}>
            <ul className="text-[13.5px]">{items.map((b) => <li key={b.id} className="flex justify-between border-b border-line py-1.5"><span><span className="num">{b.ref}</span> · {carName(s.cars.find((c) => c.id === b.carId)!)} <span className="text-mute">{fmtDateY(b.start)}</span></span><span className="num">{naira(b.total)}</span></li>)}</ul>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="font-semibold">Total <span className="num">{naira(total)}</span> <span className="text-[12.5px] font-normal text-mute">incl. VAT 7.5%: {naira(Math.round(total * 0.075 / 1.075))}</span></p>
              <span className="flex gap-2">
                <Button size="appSm" variant="subtle" icon={<Download className="size-3.5" />} onClick={() => downloadCsv(`${m.replace(' ', '-')}-invoice.csv`, items.map((b) => ({ ref: b.ref, date: b.start.slice(0, 10), car: carName(s.cars.find((c) => c.id === b.carId)!), amount: b.total })))}>CSV</Button>
                <Button size="appSm" variant="subtle" icon={<Printer className="size-3.5" />} onClick={() => window.print()}>Print</Button>
              </span>
            </div>
          </Panel>
        )
      })}
      {!list.length && <EmptyState title="No invoices yet" body="Your first invoice appears after your first trip." />}
    </div>
  )
}

function Bookers({ coId }: { coId: string }) {
  const co = useDb((x) => x.corporates.find((c) => c.id === coId)!)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  return (
    <Panel title="People who can book on this account">
      <ul>
        {co.bookers.map((b) => (
          <li key={b.email} className="flex items-center justify-between border-b border-line py-2.5 text-[13.5px]">
            <span><span className="font-semibold">{b.name}</span> <Pill tone="mute" className="ml-1">{b.role}</Pill><span className="block text-[12px] text-mute">{b.email}</span></span>
            {b.role !== 'Admin' && <button type="button" aria-label={`Remove ${b.name}`} className="text-mute hover:text-bad" onClick={() => { db.set((d) => { const c = d.corporates.find((x) => x.id === coId)!; c.bookers = c.bookers.filter((x) => x.email !== b.email) }); toast.success(`${b.name} removed`) }}><Trash2 className="size-4" /></button>}
          </li>
        ))}
      </ul>
      <form className="mt-4 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (!name.trim() || !/\S+@\S+\.\S+/.test(email)) { toast.error('Enter a name and a valid email'); return } db.set((d) => { d.corporates.find((x) => x.id === coId)!.bookers.push({ name, email, role: 'Booker' }) }); toast.success(`Invite sent to ${email}`); setName(''); setEmail('') }}>
        <Input compact placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="w-48" aria-label="Booker name" />
        <Input compact placeholder="Work email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-64" aria-label="Booker email" />
        <Button type="submit" size="app" icon={<Plus className="size-4" />}>Invite booker</Button>
      </form>
    </Panel>
  )
}
