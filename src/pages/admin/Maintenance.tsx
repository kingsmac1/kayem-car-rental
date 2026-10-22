import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Plus, RefreshCw, Wrench } from 'lucide-react'
import { toast } from 'sonner'
import { audit, db, useDb, useSession } from '@/lib/db'
import { seesMoney } from '@/lib/roles'
import { addDays, cn, downloadCsv, fmtDateY, naira } from '@/lib/utils'
import { carName } from '@/mocks/cars'
import type { DocType, MaintenanceRecord } from '@/mocks/types'
import { bookability, docState } from '@/services/fleet'
import { AdminTitle, TableWrap, Td, Th } from '@/components/admin/kit'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { AppField, Input, Select } from '@/components/ui/input'
import { Panel, Pill, Progress, Stat } from '@/components/ui/misc'

const DOCS: DocType[] = ['Vehicle licence', 'Insurance', 'Roadworthiness', 'Proof of ownership']

export default function Maintenance() {
  const s = useDb((x) => x)
  const money = seesMoney(useSession().staff!.role)
  const [logFor, setLogFor] = useState<string | null>(null)
  const [carFilter, setCarFilter] = useState('all')

  const service = useMemo(
    () =>
      s.cars
        .map((c) => {
          const since = c.mileage - c.lastServiceKm
          return { car: c, since, pct: (since / c.serviceEveryKm) * 100, left: c.serviceEveryKm - since }
        })
        .sort((a, b) => b.pct - a.pct),
    [s.cars],
  )
  const blocked = s.cars.map((c) => ({ c, b: bookability(c) })).filter((x) => !x.b.ok && x.c.status !== 'maintenance')
  const docCounts = s.cars.flatMap((c) => c.documents.map((d) => docState(d.expires)))
  const repairs = s.maintenance.filter((m) => carFilter === 'all' || m.carId === carFilter).sort((a, b) => +new Date(b.date) - +new Date(a.date))

  const renew = (carId: string, type: DocType) => {
    db.set((d) => {
      const doc = d.cars.find((c) => c.id === carId)?.documents.find((x) => x.type === type)
      if (doc) doc.expires = addDays(new Date(), 365).toISOString()
    })
    const car = s.cars.find((c) => c.id === carId)!
    audit(`Renewed ${type} for ${carName(car)}`)
    toast.success(`${type} renewed for 12 months`)
  }

  return (
    <div>
      <AdminTitle title="Maintenance & documents" sub="Cars with expired documents or overdue servicing are blocked from booking automatically.">
        <Button size="app" icon={<Plus className="size-4" />} onClick={() => setLogFor('')}>Log work</Button>
      </AdminTitle>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Blocked by rules" value={blocked.length} tone={blocked.length ? 'bad' : undefined} sub="docs or service" />
        <Stat label="Service due < 1,500 km" value={service.filter((x) => x.left < 1500 && x.left >= 0).length} tone="warn" />
        <Stat label="Documents expiring (30d)" value={docCounts.filter((d) => d === 'soon').length} tone="warn" />
        <Stat label="Documents expired" value={docCounts.filter((d) => d === 'expired').length} tone={docCounts.includes('expired') ? 'bad' : undefined} />
      </div>

      {blocked.length > 0 && (
        <Panel title="Blocked from booking" className="mt-6">
          <ul className="flex flex-col gap-2">
            {blocked.map(({ c, b }) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 border border-bad/30 bg-bad/5 px-3 py-2.5 text-[13.5px]">
                <span className="flex items-center gap-2"><AlertTriangle className="size-4 text-bad" /><span className="font-semibold">{carName(c)}</span><span className="text-mute">{c.plate} · {c.city}</span></span>
                <span className="text-bad">{b.reasons.join(' · ')}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Tabs defaultValue="service" className="mt-6">
        <TabsList>
          <TabsTrigger value="service">Service schedule</TabsTrigger>
          <TabsTrigger value="docs">Documents</TabsTrigger>
          <TabsTrigger value="history">Repair history</TabsTrigger>
        </TabsList>
        <TabsContent value="service" className="pt-4">
          <TableWrap>
            <thead><tr><Th>Car</Th><Th>Mileage</Th><Th>Since last service</Th><Th>Next service</Th><Th /></tr></thead>
            <tbody>
              {service.map(({ car, since, pct, left }) => (
                <tr key={car.id}>
                  <Td><span className="font-semibold">{carName(car)}</span><span className="block text-[12px] text-mute">{car.plate} · every {car.serviceEveryKm.toLocaleString()} km</span></Td>
                  <Td className="num">{car.mileage.toLocaleString()} km</Td>
                  <Td className="w-64"><div className="flex items-center gap-2"><Progress value={pct} tone={pct > 100 ? 'bad' : pct > 85 ? 'warn' : 'ok'} /><span className="num w-20 text-right text-[12.5px]">{since.toLocaleString()} km</span></div></Td>
                  <Td>{left < 0 ? <Pill tone="bad">Overdue {Math.abs(left).toLocaleString()} km</Pill> : left < 1500 ? <Pill tone="warn">In {left.toLocaleString()} km</Pill> : <span className="num text-mute">In {left.toLocaleString()} km</span>}</Td>
                  <Td className="text-right"><Button size="appSm" variant="subtle" icon={<Wrench className="size-3.5" />} onClick={() => setLogFor(car.id)}>Log service</Button></Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </TabsContent>
        <TabsContent value="docs" className="pt-4">
          <div className="mb-3 flex flex-wrap gap-3 text-[12.5px] text-mute">
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-ok" />OK</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-warn" />Expires within 30 days</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-bad" />Expired — car blocked</span>
          </div>
          <TableWrap>
            <thead><tr><Th>Car</Th>{DOCS.map((d) => <Th key={d}>{d}</Th>)}</tr></thead>
            <tbody>
              {s.cars.map((car) => (
                <tr key={car.id}>
                  <Td><span className="font-semibold">{carName(car)}</span><span className="block num text-[12px] text-mute">{car.plate}</span></Td>
                  {DOCS.map((type) => {
                    const doc = car.documents.find((d) => d.type === type)!
                    const st = docState(doc.expires)
                    return (
                      <Td key={type}>
                        <span className={cn('inline-flex flex-col rounded-[2px] border px-2 py-1 text-[12px]', st === 'ok' ? 'border-ok/25 bg-ok/8' : st === 'soon' ? 'border-warn/30 bg-warn/10' : 'border-bad/40 bg-bad/10')}>
                          <span className={cn('font-semibold', st === 'ok' ? 'text-ok' : st === 'soon' ? 'text-warn' : 'text-bad')}>{st === 'ok' ? 'OK' : st === 'soon' ? 'Expiring' : 'Expired'}</span>
                          <span className="text-mute">{fmtDateY(doc.expires)}</span>
                        </span>
                        {st !== 'ok' && <button type="button" onClick={() => renew(car.id, type)} className="ml-2 inline-flex items-center gap-1 text-[12px] text-accent hover:underline"><RefreshCw className="size-3" />Renew</button>}
                      </Td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </TabsContent>
        <TabsContent value="history" className="pt-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Select compact value={carFilter} onChange={(e) => setCarFilter(e.target.value)} className="w-64" aria-label="Filter by car">
              <option value="all">All cars</option>
              {s.cars.map((c) => <option key={c.id} value={c.id}>{carName(c)} · {c.plate}</option>)}
            </Select>
            {money && <span className="text-[13px] text-mute">Total <span className="num text-paper">{naira(repairs.reduce((a, r) => a + r.cost, 0))}</span></span>}
            <Button size="appSm" variant="subtle" className="ml-auto" onClick={() => downloadCsv('repairs.csv', repairs.map((r) => ({ date: r.date.slice(0, 10), car: carName(s.cars.find((c) => c.id === r.carId)!), kind: r.kind, description: r.description, km: r.km, cost: money ? r.cost : '', vendor: r.vendor })))}>Export CSV</Button>
          </div>
          <TableWrap>
            <thead><tr><Th>Date</Th><Th>Car</Th><Th>Work</Th><Th>Odometer</Th><Th>Vendor</Th>{money && <Th className="text-right">Cost</Th>}</tr></thead>
            <tbody>
              {repairs.map((r) => (
                <tr key={r.id}>
                  <Td className="whitespace-nowrap text-mute">{fmtDateY(r.date)}</Td>
                  <Td>{carName(s.cars.find((c) => c.id === r.carId)!)}</Td>
                  <Td><Pill tone="mute" className="mr-2">{r.kind}</Pill>{r.description}</Td>
                  <Td className="num">{r.km.toLocaleString()} km</Td>
                  <Td className="text-mute">{r.vendor}</Td>
                  {money && <Td className="num text-right">{naira(r.cost)}</Td>}
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </TabsContent>
      </Tabs>

      <Dialog open={logFor !== null} onOpenChange={(o) => !o && setLogFor(null)}>
        {logFor !== null && (
          <DialogContent title="Log maintenance work" description="Logging a service resets the service counter and unblocks the car if that was the only problem.">
            <LogForm carId={logFor} onDone={() => setLogFor(null)} />
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}

function LogForm({ carId, onDone }: { carId: string; onDone: () => void }) {
  const cars = useDb((x) => x.cars)
  const [id, setId] = useState(carId || cars[0].id)
  const car = cars.find((c) => c.id === id)!
  const [kind, setKind] = useState<MaintenanceRecord['kind']>('Service')
  const [desc, setDesc] = useState('Oil, filters and full check')
  const [km, setKm] = useState(String(car.mileage))
  const [cost, setCost] = useState('85000')
  const [vendor, setVendor] = useState('Toyota Nigeria Service, Ikeja')
  const save = () => {
    const rec: MaintenanceRecord = { id: `m-${Date.now()}`, carId: id, date: new Date().toISOString(), kind, description: desc, km: Number(km), cost: Number(cost), vendor }
    db.set((d) => {
      d.maintenance.push(rec)
      const c = d.cars.find((x) => x.id === id)
      if (c) {
        c.mileage = Math.max(c.mileage, Number(km))
        if (kind === 'Service') c.lastServiceKm = Number(km)
        if (c.status === 'maintenance') c.status = 'available'
      }
    })
    audit(`Logged ${kind.toLowerCase()} for ${carName(car)}`)
    toast.success(`${kind} logged for ${carName(car)}`)
    onDone()
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <AppField label="Car" htmlFor="lf-car" className="sm:col-span-2"><Select compact id="lf-car" value={id} onChange={(e) => { setId(e.target.value); setKm(String(cars.find((c) => c.id === e.target.value)!.mileage)) }}>{cars.map((c) => <option key={c.id} value={c.id}>{carName(c)} · {c.plate}</option>)}</Select></AppField>
      <AppField label="Type" htmlFor="lf-k"><Select compact id="lf-k" value={kind} onChange={(e) => setKind(e.target.value as MaintenanceRecord['kind'])}>{['Service', 'Repair', 'Tyres', 'Body work', 'Inspection'].map((k) => <option key={k}>{k}</option>)}</Select></AppField>
      <AppField label="Odometer (km)" htmlFor="lf-km"><Input compact id="lf-km" type="number" value={km} onChange={(e) => setKm(e.target.value)} /></AppField>
      <AppField label="Description" htmlFor="lf-d" className="sm:col-span-2"><Input compact id="lf-d" value={desc} onChange={(e) => setDesc(e.target.value)} /></AppField>
      <AppField label="Cost (₦)" htmlFor="lf-c"><Input compact id="lf-c" type="number" value={cost} onChange={(e) => setCost(e.target.value)} /></AppField>
      <AppField label="Vendor" htmlFor="lf-v"><Input compact id="lf-v" value={vendor} onChange={(e) => setVendor(e.target.value)} /></AppField>
      <div className="flex justify-end sm:col-span-2"><Button size="app" onClick={save} icon={<CheckCircle2 className="size-4" />} disabled={!desc || !Number(cost)}>Save record</Button></div>
    </div>
  )
}
