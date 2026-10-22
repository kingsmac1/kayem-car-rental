import { useState } from 'react'
import { Star } from 'lucide-react'
import { toast } from 'sonner'
import { audit, db, useDb, useSession } from '@/lib/db'
import { seesMoney } from '@/lib/roles'
import { addDays, cn, fmtDateY, fmtDay, fmtTime, isoDate, naira, startOfDay } from '@/lib/utils'
import { carName } from '@/mocks/cars'
import { locationName } from '@/mocks/locations'
import type { Chauffeur } from '@/mocks/types'
import { AdminTitle, TableWrap, Td, Th } from '@/components/admin/kit'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Avatar, Panel, Pill } from '@/components/ui/misc'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function Chauffeurs() {
  const s = useDb((x) => x)
  const money = seesMoney(useSession().staff!.role)
  const [openId, setOpenId] = useState<string | null>(null)
  const unassigned = s.bookings.filter((b) => b.mode === 'chauffeur' && !b.chauffeurId && ['pending', 'confirmed'].includes(b.status)).sort((a, b) => +new Date(a.start) - +new Date(b.start))
  const days = Array.from({ length: 14 }, (_, i) => addDays(startOfDay(), i))
  const sel = s.chauffeurs.find((d) => d.id === openId)

  const assign = (bookingId: string, driverId: string) => {
    const b = s.bookings.find((x) => x.id === bookingId)!
    const clash = s.bookings.some((x) => x.chauffeurId === driverId && x.id !== bookingId && ['confirmed', 'active'].includes(x.status) && new Date(x.start) < new Date(b.end) && new Date(x.end) > new Date(b.start))
    if (clash) {
      toast.error('That chauffeur already has a job at that time.')
      return
    }
    db.set((d) => {
      const x = d.bookings.find((y) => y.id === bookingId)
      if (x) x.chauffeurId = driverId
    })
    const name = s.chauffeurs.find((d) => d.id === driverId)!.name
    audit(`Assigned ${name} to ${b.ref}`)
    toast.success(`${name} assigned to ${b.ref}`)
  }

  return (
    <div>
      <AdminTitle title="Chauffeurs" sub={`${s.chauffeurs.length} chauffeurs · ${s.chauffeurs.filter((d) => d.available).length} available today`} />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <TableWrap>
          <thead><tr><Th>Chauffeur</Th><Th>City</Th><Th>Rating</Th><Th className="text-right">Trips</Th>{money && <Th className="text-right">This month</Th>}{money && <Th className="text-right">Payout due</Th>}<Th>Available</Th></tr></thead>
          <tbody>
            {s.chauffeurs.map((d) => (
              <tr key={d.id} className="cursor-pointer hover:bg-paper/[0.03]" onClick={() => setOpenId(d.id)}>
                <Td><span className="flex items-center gap-2.5"><Avatar name={d.name} /><span><span className="font-semibold">{d.name}</span><span className="block text-[12px] text-mute">{d.years} yrs · {d.languages.join(', ')}</span></span></span></Td>
                <Td>{d.city}</Td>
                <Td><span className="inline-flex items-center gap-1"><Star className="size-3.5 fill-accent text-accent" /><span className="num">{d.rating.toFixed(1)}</span></span></Td>
                <Td className="num text-right">{d.trips}</Td>
                {money && <Td className="num text-right">{naira(d.earningsMonth)}</Td>}
                {money && <Td className="num text-right">{naira(d.payoutPending)}</Td>}
                <Td><span onClick={(e) => e.stopPropagation()}><Switch checked={d.available} onCheckedChange={(v) => { db.set((x) => { x.chauffeurs.find((y) => y.id === d.id)!.available = v }); audit(`Set ${d.name} ${v ? 'available' : 'off duty'}`) }} aria-label={`${d.name} available`} /></span></Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
        <Panel title={`Jobs needing a chauffeur · ${unassigned.length}`}>
          {unassigned.length ? (
            <ul className="flex flex-col">
              {unassigned.slice(0, 8).map((b) => {
                const car = s.cars.find((c) => c.id === b.carId)!
                return (
                  <li key={b.id} className="border-b border-line py-3 text-[13.5px] last:border-0">
                    <p className="font-semibold">{carName(car)} <span className="num font-normal text-mute">{b.ref}</span></p>
                    <p className="text-[12.5px] text-mute">{fmtDay(b.start)} {fmtTime(b.start)} · {locationName(b.pickup)}</p>
                    <Select compact className="mt-2" value="" onChange={(e) => e.target.value && assign(b.id, e.target.value)} aria-label={`Assign chauffeur to ${b.ref}`}>
                      <option value="">Assign chauffeur…</option>
                      {s.chauffeurs.filter((d) => d.city === car.city).map((d) => <option key={d.id} value={d.id} disabled={!d.available}>{d.name} · {d.rating.toFixed(1)}★{d.available ? '' : ' (off)'}</option>)}
                    </Select>
                  </li>
                )
              })}
            </ul>
          ) : <p className="text-[13.5px] text-mute">Every chauffeur job has a driver.</p>}
        </Panel>
      </div>

      <Panel title="Availability, next 14 days" className="mt-6" bodyClass="p-0">
        <div className="overflow-x-auto" data-lenis-prevent>
          <table className="w-full min-w-[860px] text-[12px]">
            <thead>
              <tr>
                <th scope="col" className="sticky left-0 border-b border-line bg-ink-2 px-3 py-2 text-left font-semibold text-mute">Chauffeur</th>
                {days.map((d) => <th key={d.toISOString()} scope="col" className={cn('border-b border-line px-1 py-2 text-center font-semibold', [0, 6].includes(d.getDay()) ? 'text-paper/70' : 'text-mute')}>{d.toLocaleDateString('en-GB', { weekday: 'narrow' })}<br />{d.getDate()}</th>)}
              </tr>
            </thead>
            <tbody>
              {s.chauffeurs.map((dr) => (
                <tr key={dr.id}>
                  <td className="sticky left-0 border-b border-line bg-ink-2 px-3 py-2 font-semibold">{dr.name}</td>
                  {days.map((day) => {
                    const job = s.bookings.find((b) => b.chauffeurId === dr.id && b.status !== 'cancelled' && isoDate(b.start) <= isoDate(day) && isoDate(b.end) >= isoDate(day))
                    return (
                      <td key={day.toISOString()} className="border-b border-line p-1">
                        <div className={cn('h-7 rounded-[2px]', job ? 'bg-accent/80' : dr.available ? 'bg-ok/15' : 'bg-paper/5')} title={job ? `${job.ref}` : dr.available ? 'Free' : 'Off duty'} />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-4 border-t border-line px-4 py-2.5 text-[12px] text-mute">
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-accent/80" />On a job</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-ok/30" />Free</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-paper/10" />Off duty</span>
        </div>
      </Panel>

      <Dialog open={!!sel} onOpenChange={(o) => !o && setOpenId(null)}>{sel && <ChauffeurDrawer d={sel} money={money} />}</Dialog>
    </div>
  )
}

function ChauffeurDrawer({ d, money }: { d: Chauffeur; money: boolean }) {
  const s = useDb((x) => x)
  const jobs = s.bookings.filter((b) => b.chauffeurId === d.id).sort((a, b) => +new Date(b.start) - +new Date(a.start))
  return (
    <DialogContent side="right" title={d.name} description={`${d.city} · ${d.phone}`}>
      <div className="grid grid-cols-3 gap-2 text-[13px]">
        <div className="border border-line p-3"><p className="text-mute">Rating</p><p className="num text-lg">{d.rating.toFixed(1)}★</p></div>
        <div className="border border-line p-3"><p className="text-mute">Trips</p><p className="num text-lg">{d.trips}</p></div>
        <div className="border border-line p-3"><p className="text-mute">Experience</p><p className="num text-lg">{d.years} yrs</p></div>
      </div>
      <Tabs defaultValue="trips" className="mt-5">
        <TabsList><TabsTrigger value="trips">Trip log</TabsTrigger>{money && <TabsTrigger value="pay">Earnings & payouts</TabsTrigger>}<TabsTrigger value="docs">Profile</TabsTrigger></TabsList>
        <TabsContent value="trips" className="pt-4">
          <ul className="text-[13.5px]">
            {jobs.slice(0, 12).map((b) => (
              <li key={b.id} className="flex justify-between gap-3 border-b border-line py-2.5">
                <span><span className="num">{b.ref}</span> · {carName(s.cars.find((c) => c.id === b.carId)!)}<span className="block text-[12px] text-mute">{fmtDateY(b.start)} · {locationName(b.pickup)}</span></span>
                <span className="text-right">{b.rating ? <span className="num">{b.rating}★</span> : <Pill tone="mute" className="capitalize">{b.status}</Pill>}</span>
              </li>
            ))}
            {!jobs.length && <li className="text-mute">No trips logged yet.</li>}
          </ul>
        </TabsContent>
        {money && (
          <TabsContent value="pay" className="pt-4 text-[13.5px]">
            <p className="flex justify-between border-b border-line py-2"><span>Earnings this month</span><span className="num">{naira(d.earningsMonth)}</span></p>
            <p className="flex justify-between border-b border-line py-2"><span>Payout pending</span><span className="num text-accent">{naira(d.payoutPending)}</span></p>
            <Button size="app" className="mt-3" disabled={!d.payoutPending} onClick={() => { db.set((x) => { x.chauffeurs.find((y) => y.id === d.id)!.payoutPending = 0 }); audit(`Paid ${d.name} ${naira(d.payoutPending)}`); toast.success(`Payout of ${naira(d.payoutPending)} sent`) }}>Pay {naira(d.payoutPending)} now</Button>
          </TabsContent>
        )}
        <TabsContent value="docs" className="pt-4 text-[13.5px]">
          <p className="flex justify-between border-b border-line py-2"><span>Languages</span><span>{d.languages.join(', ')}</span></p>
          <p className="flex justify-between border-b border-line py-2"><span>Licence expires</span><span>{fmtDateY(d.licenceExpiry)}</span></p>
          <p className="flex justify-between border-b border-line py-2"><span>Background check</span><Pill tone="ok">Passed</Pill></p>
        </TabsContent>
      </Tabs>
    </DialogContent>
  )
}
