import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { brand } from '@/config/brand'
import { audit, useDb, useSession } from '@/lib/db'
import { carMaintenanceCost, carRevenue, utilisation } from '@/lib/metrics'
import { seesMoney } from '@/lib/roles'
import { addDays, cn, fmtDateY, naira, startOfDay } from '@/lib/utils'
import { carName } from '@/mocks/cars'
import type { Car, CarCategory, CarStatus } from '@/mocks/types'
import { bookability, docState, effectiveStatus, fleetService } from '@/services/fleet'
import { images, sm } from '@/data/images'
import { AdminTitle, BookingStatus, SearchBox, Segmented, TableWrap, Td, Th } from '@/components/admin/kit'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AppField, Input, Select } from '@/components/ui/input'
import { Pill, Progress } from '@/components/ui/misc'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const STATUS_TONE: Record<CarStatus, 'ok' | 'accent' | 'warn' | 'bad'> = { available: 'ok', rented: 'accent', maintenance: 'warn', blocked: 'bad' }

export default function Fleet() {
  const s = useDb((x) => x)
  const money = seesMoney(useSession().staff!.role)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<CarStatus | 'all'>('all')
  const [view, setView] = useState<'grid' | 'table'>('grid')
  const [openId, setOpenId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const from = addDays(startOfDay(), -30)

  const rows = useMemo(
    () =>
      s.cars
        .map((c) => ({ car: c, st: effectiveStatus(c), rev: carRevenue(s, c.id, from), maint: carMaintenanceCost(s, c.id, from), util: utilisation(s, from, new Date(), c.id), docs: c.documents.map((d) => docState(d.expires)) }))
        .filter((r) => status === 'all' || r.st === status)
        .filter((r) => !q || `${carName(r.car)} ${r.car.plate} ${r.car.city}`.toLowerCase().includes(q.toLowerCase())),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [s, q, status],
  )
  const selected = s.cars.find((c) => c.id === openId)

  return (
    <div>
      <AdminTitle title="Fleet" sub={`${s.cars.length} cars · ${s.cars.filter((c) => effectiveStatus(c) === 'available').length} available now`}>
        <Segmented label="View" value={view} onChange={setView} options={[{ id: 'grid', label: 'Cards' }, { id: 'table', label: 'Table' }]} />
        <Button size="app" icon={<Plus className="size-4" />} onClick={() => setAdding(true)}>Add car</Button>
      </AdminTitle>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchBox value={q} onChange={setQ} placeholder="Search model, plate, city" />
        <Segmented
          label="Status"
          value={status}
          onChange={setStatus}
          options={(['all', 'available', 'rented', 'maintenance', 'blocked'] as const).map((k) => ({ id: k, label: <span className="capitalize">{k} {k !== 'all' ? <span className="num text-mute">{s.cars.filter((c) => effectiveStatus(c) === k).length}</span> : null}</span> }))}
        />
      </div>

      {view === 'grid' ? (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {rows.map(({ car, st, rev, maint, util, docs }) => (
            <li key={car.id}>
              <button type="button" onClick={() => setOpenId(car.id)} className="w-full border border-line bg-ink-2 text-left transition-colors hover:border-line-strong">
                <div className="relative">
                  <img src={sm(car.image)} alt="" className="aspect-[16/9] w-full object-cover" loading="lazy" />
                  <span className="absolute left-2 top-2"><Pill tone={STATUS_TONE[st]} className="bg-ink/85 capitalize">{st}</Pill></span>
                  {docs.includes('expired') ? <span className="absolute right-2 top-2"><Pill tone="bad" className="bg-ink/85">Doc expired</Pill></span> : docs.includes('soon') ? <span className="absolute right-2 top-2"><Pill tone="warn" className="bg-ink/85">Doc expiring</Pill></span> : null}
                </div>
                <div className="p-3">
                  <p className="font-semibold">{carName(car)} <span className="font-normal text-mute">{car.year}</span></p>
                  <p className="text-[12.5px] text-mute">{car.city} · <span className="num">{car.plate}</span> · <span className="num">{car.mileage.toLocaleString()} km</span></p>
                  <div className="mt-3 flex items-center gap-3 text-[12px]">
                    <span className="w-24 text-mute">Utilisation 30d</span>
                    <Progress value={util * 100} className="flex-1" />
                    <span className="num w-9 text-right">{Math.round(util * 100)}%</span>
                  </div>
                  {money && (
                    <p className="mt-2 flex justify-between text-[12.5px]">
                      <span className="text-mute">Profit 30d</span>
                      <span className={cn('num', rev - maint < 0 ? 'text-bad' : 'text-paper')}>{naira(rev - maint)}</span>
                    </p>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <TableWrap>
          <thead>
            <tr><Th>Car</Th><Th>City</Th><Th>Status</Th><Th>Mileage</Th><Th>Documents</Th><Th>Utilisation</Th>{money && <Th className="text-right">Revenue 30d</Th>}{money && <Th className="text-right">Profit 30d</Th>}</tr>
          </thead>
          <tbody>
            {rows.map(({ car, st, rev, maint, util, docs }) => (
              <tr key={car.id} className="cursor-pointer hover:bg-paper/[0.03]" onClick={() => setOpenId(car.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setOpenId(car.id)}>
                <Td><span className="font-semibold">{carName(car)}</span><span className="block num text-[12px] text-mute">{car.plate}</span></Td>
                <Td>{car.city}</Td>
                <Td><Pill tone={STATUS_TONE[st]} className="capitalize">{st}</Pill></Td>
                <Td className="num">{car.mileage.toLocaleString()} km</Td>
                <Td>{docs.includes('expired') ? <Pill tone="bad">Expired</Pill> : docs.includes('soon') ? <Pill tone="warn">Expiring</Pill> : <Pill tone="ok">OK</Pill>}</Td>
                <Td className="num">{Math.round(util * 100)}%</Td>
                {money && <Td className="num text-right">{naira(rev)}</Td>}
                {money && <Td className={cn('num text-right', rev - maint < 0 && 'text-bad')}>{naira(rev - maint)}</Td>}
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setOpenId(null)}>
        {selected && <CarDrawer car={selected} money={money} />}
      </Dialog>
      <Dialog open={adding} onOpenChange={setAdding}>
        {adding && (
          <DialogContent title="Add a car" description="New cars start as available. Add documents from the car’s page afterwards." className="max-w-2xl">
            <CarForm onDone={() => setAdding(false)} />
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}

function CarDrawer({ car, money }: { car: Car; money: boolean }) {
  const s = useDb((x) => x)
  const [reason, setReason] = useState('')
  const [editing, setEditing] = useState(false)
  const st = effectiveStatus(car)
  const b = bookability(car)
  const bookings = s.bookings.filter((x) => x.carId === car.id).sort((x, y) => +new Date(y.start) - +new Date(x.start))
  const repairs = s.maintenance.filter((m) => m.carId === car.id).sort((x, y) => +new Date(y.date) - +new Date(x.date))
  const lifetimeRev = carRevenue(s, car.id)
  const lifetimeMaint = carMaintenanceCost(s, car.id)
  const setStatus = async (next: CarStatus) => {
    await fleetService.setStatus(car.id, next, next === 'blocked' ? reason || 'Blocked by staff' : undefined)
    audit(`Set ${carName(car)} to ${next}`)
    toast.success(`${carName(car)} is now ${next}`)
  }
  const owner = car.owner === 'company' ? `${brand.shortName} (company-owned)` : s.partners.find((p) => p.id === car.owner)?.name

  return (
    <DialogContent side="right" title={carName(car)} description={`${car.year} · ${car.colour} · ${car.plate} · ${car.city}`}>
      {editing ? (
        <>
          <CarForm existing={car} onDone={() => setEditing(false)} />
          <Button size="app" variant="subtle" className="mt-3" onClick={() => setEditing(false)}>Back</Button>
        </>
      ) : (
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="docs">Documents</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="history">Repairs</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="flex flex-col gap-5 pt-5 text-[13.5px]">
            <div className="grid grid-cols-3 gap-2">
              {car.gallery.slice(0, 3).map((g) => <img key={g} src={sm(g)} alt="" className="aspect-[4/3] w-full object-cover" />)}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={STATUS_TONE[st]} className="capitalize">{st}</Pill>
              {!b.ok && <span className="text-bad">{b.reasons.join(' · ')}</span>}
            </div>
            <dl className="grid grid-cols-2 gap-3">
              <div><dt className="text-mute">Mileage</dt><dd className="num font-semibold">{car.mileage.toLocaleString()} km</dd></div>
              <div><dt className="text-mute">Next service</dt><dd className={cn('num font-semibold', car.mileage - car.lastServiceKm > car.serviceEveryKm && 'text-bad')}>{(car.lastServiceKm + car.serviceEveryKm).toLocaleString()} km</dd></div>
              <div><dt className="text-mute">Fuel</dt><dd className="num font-semibold">{car.fuelLevel}%</dd></div>
              <div><dt className="text-mute">Owner</dt><dd className="font-semibold">{owner}</dd></div>
              <div><dt className="text-mute">Daily rate</dt><dd className="num font-semibold">{naira(car.rates.daily)}</dd></div>
              <div><dt className="text-mute">Deposit</dt><dd className="num font-semibold">{naira(car.deposit)}</dd></div>
              {money && <div><dt className="text-mute">Lifetime revenue</dt><dd className="num font-semibold">{naira(lifetimeRev)}</dd></div>}
              {money && <div><dt className="text-mute">Lifetime profit</dt><dd className="num font-semibold text-accent">{naira(lifetimeRev - lifetimeMaint)}</dd></div>}
            </dl>
            <div className="border-t border-line pt-4">
              <p className="mb-2 text-xs font-semibold text-mute">Change status</p>
              <div className="flex flex-wrap gap-2">
                {car.status !== 'available' && car.status !== 'rented' && <Button size="appSm" variant="subtle" onClick={() => setStatus('available')}>Make available</Button>}
                {car.status !== 'maintenance' && car.status !== 'rented' && <Button size="appSm" variant="subtle" onClick={() => setStatus('maintenance')}>Send to maintenance</Button>}
                {car.status !== 'blocked' && car.status !== 'rented' && (
                  <>
                    <Input compact placeholder="Reason to block" value={reason} onChange={(e) => setReason(e.target.value)} className="w-48" aria-label="Block reason" />
                    <Button size="appSm" variant="subtle" className="text-bad" onClick={() => setStatus('blocked')}>Block</Button>
                  </>
                )}
                {car.status === 'rented' && <p className="text-mute">Car is on a rental — status follows the booking.</p>}
              </div>
            </div>
            <Button size="app" variant="subtle" onClick={() => setEditing(true)} className="self-start">Edit car details</Button>
          </TabsContent>
          <TabsContent value="docs" className="pt-5">
            <ul className="flex flex-col gap-2 text-[13.5px]">
              {car.documents.map((d) => {
                const ds = docState(d.expires)
                return (
                  <li key={d.type} className="flex items-center justify-between gap-3 border border-line px-3 py-2.5">
                    <span><span className="font-semibold">{d.type}</span><span className="block num text-[12px] text-mute">{d.number}</span></span>
                    <span className="text-right"><Pill tone={ds === 'ok' ? 'ok' : ds === 'soon' ? 'warn' : 'bad'}>{ds === 'ok' ? 'OK' : ds === 'soon' ? 'Expiring soon' : 'Expired'}</Pill><span className="mt-1 block text-[12px] text-mute">{fmtDateY(d.expires)}</span></span>
                  </li>
                )
              })}
            </ul>
            <p className="mt-3 text-[12.5px] text-mute">Cars with an expired document are blocked from booking automatically. Renew in Maintenance & docs.</p>
          </TabsContent>
          <TabsContent value="bookings" className="pt-5">
            <ul className="flex flex-col text-[13.5px]">
              {bookings.slice(0, 15).map((x) => (
                <li key={x.id} className="flex items-center justify-between gap-3 border-b border-line py-2.5">
                  <span><span className="num">{x.ref}</span> · {s.customers.find((c) => c.id === x.customerId)?.name}<span className="block text-[12px] text-mute">{fmtDateY(x.start)} → {fmtDateY(x.end)}</span></span>
                  <BookingStatus status={x.status} />
                </li>
              ))}
              {!bookings.length && <li className="text-mute">No bookings yet.</li>}
            </ul>
          </TabsContent>
          <TabsContent value="history" className="pt-5">
            <ul className="flex flex-col text-[13.5px]">
              {repairs.map((m) => (
                <li key={m.id} className="flex justify-between gap-3 border-b border-line py-2.5">
                  <span><span className="font-semibold">{m.kind}</span> — {m.description}<span className="block text-[12px] text-mute">{fmtDateY(m.date)} · {m.vendor} · {m.km.toLocaleString()} km</span></span>
                  {money && <span className="num shrink-0">{naira(m.cost)}</span>}
                </li>
              ))}
            </ul>
            {money && <p className="mt-3 text-right text-[13px] text-mute">Total repairs <span className="num text-paper">{naira(lifetimeMaint)}</span></p>}
          </TabsContent>
        </Tabs>
      )}
    </DialogContent>
  )
}

function CarForm({ existing, onDone }: { existing?: Car; onDone: () => void }) {
  const [f, setF] = useState({
    make: existing?.make ?? '', model: existing?.model ?? '', year: existing?.year ?? new Date().getFullYear() - 1, category: existing?.category ?? ('SUV' as CarCategory),
    city: existing?.city ?? brand.cities[0], seats: existing?.seats ?? 5, plate: existing?.plate ?? '', colour: existing?.colour ?? 'Black', daily: existing?.rates.daily ?? 100000,
    deposit: existing?.deposit ?? 150000, mileage: existing?.mileage ?? 10000, chauffeurOnly: existing ? existing.modes.length === 1 : false,
  })
  const [error, setError] = useState('')
  const set = (k: keyof typeof f, v: string | number | boolean) => setF((p) => ({ ...p, [k]: v }))
  const save = async () => {
    if (!f.make || !f.model || !/^[A-Z]{3}-\d{3}[A-Z]{2}$/i.test(f.plate)) {
      setError('Make, model and a plate like LND-123AB are required.')
      return
    }
    const id = existing?.id ?? `${f.model.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36).slice(-4)}`
    const in1y = addDays(new Date(), 365).toISOString()
    const car: Car = {
      ...(existing ?? {
        id, transmission: 'Automatic', fuel: 'Petrol', image: images.cars.camry, gallery: [images.cars.camry], status: 'available', serviceEveryKm: 10000, lastServiceKm: f.mileage, fuelLevel: 100, owner: 'company', features: [], tagline: '',
        documents: (['Vehicle licence', 'Insurance', 'Roadworthiness', 'Proof of ownership'] as const).map((type) => ({ type, number: `NEW-${Math.floor(Math.random() * 9e5)}`, expires: in1y })),
      }),
      make: f.make, model: f.model, year: Number(f.year), category: f.category, city: f.city as Car['city'], seats: Number(f.seats), plate: f.plate.toUpperCase(), colour: f.colour, mileage: Number(f.mileage),
      rates: { hourly: Math.round(f.daily * 0.16), daily: Number(f.daily), weekly: Math.round(f.daily * 6.2), monthly: Math.round(f.daily * 22) }, deposit: Number(f.deposit),
      modes: f.chauffeurOnly ? ['chauffeur'] : ['self-drive', 'chauffeur'],
    }
    await fleetService.saveCar(car)
    audit(`${existing ? 'Edited' : 'Added'} car ${carName(car)} (${car.plate})`)
    toast.success(`${carName(car)} ${existing ? 'updated' : 'added to the fleet'}`)
    onDone()
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <AppField label="Make" htmlFor="cf-make"><Input compact id="cf-make" value={f.make} onChange={(e) => set('make', e.target.value)} /></AppField>
      <AppField label="Model" htmlFor="cf-model"><Input compact id="cf-model" value={f.model} onChange={(e) => set('model', e.target.value)} /></AppField>
      <AppField label="Year" htmlFor="cf-year"><Input compact id="cf-year" type="number" value={f.year} onChange={(e) => set('year', e.target.value)} /></AppField>
      <AppField label="Type" htmlFor="cf-cat"><Select compact id="cf-cat" value={f.category} onChange={(e) => set('category', e.target.value)}>{['Saloon', 'SUV', 'Luxury Saloon', 'Luxury SUV', 'Van', 'Bus'].map((c) => <option key={c}>{c}</option>)}</Select></AppField>
      <AppField label="City" htmlFor="cf-city"><Select compact id="cf-city" value={f.city} onChange={(e) => set('city', e.target.value)}>{brand.cities.map((c) => <option key={c}>{c}</option>)}</Select></AppField>
      <AppField label="Plate" htmlFor="cf-plate"><Input compact id="cf-plate" placeholder="LND-123AB" value={f.plate} onChange={(e) => set('plate', e.target.value)} /></AppField>
      <AppField label="Seats" htmlFor="cf-seats"><Input compact id="cf-seats" type="number" value={f.seats} onChange={(e) => set('seats', e.target.value)} /></AppField>
      <AppField label="Colour" htmlFor="cf-col"><Input compact id="cf-col" value={f.colour} onChange={(e) => set('colour', e.target.value)} /></AppField>
      <AppField label="Daily rate (₦)" htmlFor="cf-daily"><Input compact id="cf-daily" type="number" value={f.daily} onChange={(e) => set('daily', e.target.value)} /></AppField>
      <AppField label="Deposit (₦)" htmlFor="cf-dep"><Input compact id="cf-dep" type="number" value={f.deposit} onChange={(e) => set('deposit', e.target.value)} /></AppField>
      <AppField label="Mileage (km)" htmlFor="cf-km"><Input compact id="cf-km" type="number" value={f.mileage} onChange={(e) => set('mileage', e.target.value)} /></AppField>
      <label className="flex items-center gap-2 self-end pb-2 text-[13.5px]"><input type="checkbox" className="accent-[var(--brand-accent)]" checked={f.chauffeurOnly} onChange={(e) => set('chauffeurOnly', e.target.checked)} />Chauffeur only</label>
      {error ? <p role="alert" className="text-[13px] text-bad sm:col-span-2">{error}</p> : null}
      <div className="sm:col-span-2 flex justify-end"><Button size="app" onClick={save}>{existing ? 'Save car' : 'Add car'}</Button></div>
    </div>
  )
}
