import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { brand } from '@/config/brand'
import { audit, useDb } from '@/lib/db'
import { EXTRAS, quote } from '@/lib/pricing'
import { addDays, isoDate, naira } from '@/lib/utils'
import { carName } from '@/mocks/cars'
import { locations } from '@/mocks/locations'
import type { Booking, Channel } from '@/mocks/types'
import { bookability, overlaps } from '@/services/fleet'
import { bookingService, BookingConflictError } from '@/services/bookings'
import { Button } from '@/components/ui/button'
import { AppField, Input, Select } from '@/components/ui/input'

/** Create or edit a booking from the admin. Shows a live clash check (double-booking prevention). */
export function BookingForm({ existing, onDone }: { existing?: Booking; onDone: (b: Booking) => void }) {
  const s = useDb((x) => x)
  const [city, setCity] = useState<string>(existing ? s.cars.find((c) => c.id === existing.carId)!.city : brand.cities[0])
  const [carId, setCarId] = useState(existing?.carId ?? '')
  const [customerId, setCustomerId] = useState(existing?.customerId ?? '')
  const [startD, setStartD] = useState(existing ? isoDate(existing.start) : isoDate(addDays(new Date(), 1)))
  const [startT, setStartT] = useState(existing ? new Date(existing.start).toTimeString().slice(0, 5) : '10:00')
  const [endD, setEndD] = useState(existing ? isoDate(existing.end) : isoDate(addDays(new Date(), 3)))
  const [endT, setEndT] = useState(existing ? new Date(existing.end).toTimeString().slice(0, 5) : '10:00')
  const [pickup, setPickup] = useState(existing?.pickup ?? '')
  const [dropoff, setDropoff] = useState(existing?.dropoff ?? '')
  const [mode, setMode] = useState<Booking['mode']>(existing?.mode ?? 'self-drive')
  const [chauffeurId, setChauffeurId] = useState(existing?.chauffeurId ?? '')
  const [extras, setExtras] = useState<string[]>(existing?.extras ?? [])
  const [channel, setChannel] = useState<Channel>(existing?.channel ?? 'walk-in')
  const [paid, setPaid] = useState(existing ? existing.paid > 0 : true)
  const [saving, setSaving] = useState(false)

  const start = new Date(`${startD}T${startT}:00`)
  const end = new Date(`${endD}T${endT}:00`)
  const datesOk = end > start
  const car = s.cars.find((c) => c.id === carId)
  const locs = locations.filter((l) => l.city === city)
  const clashes = car && datesOk ? overlaps(s, car.id, start, end, existing?.id) : []
  const blocked = car ? bookability(car) : null
  const q = useMemo(() => (car && datesOk ? quote({ car, start, end, mode, extras, rules: s.pricing, corporate: !!s.customers.find((c) => c.id === customerId)?.corporateId }) : null), [car, datesOk, start, end, mode, extras, s.pricing, s.customers, customerId])
  const customer = s.customers.find((c) => c.id === customerId)

  const errors: string[] = []
  if (!customerId) errors.push('Choose a customer.')
  if (customer?.blacklist) errors.push(`${customer.name} is blacklisted: ${customer.blacklist.reason}`)
  if (!carId) errors.push('Choose a car.')
  if (!datesOk) errors.push('Return must be after pick-up.')
  if (blocked && !blocked.ok) errors.push(`Car is blocked: ${blocked.reasons.join(', ')}.`)
  if (clashes.length) errors.push(`Double booking: this car is already booked (${clashes.map((c) => c.ref).join(', ')}) for part of these dates.`)

  const save = async () => {
    if (errors.length || !car || !q) return
    setSaving(true)
    const pu = pickup || locs[0].id
    try {
      if (existing) {
        const b = await bookingService.update(existing.id, { carId, customerId, start: start.toISOString(), end: end.toISOString(), pickup: pu, dropoff: dropoff || pu, mode, chauffeurId: mode === 'chauffeur' ? chauffeurId || undefined : undefined, extras, total: q.total })
        audit(`Edited booking ${existing.ref}`)
        toast.success(`${existing.ref} updated`)
        onDone(b)
      } else {
        const b = await bookingService.create(
          { carId, customerId, start: start.toISOString(), end: end.toISOString(), pickup: pu, dropoff: dropoff || pu, mode, chauffeurId: mode === 'chauffeur' ? chauffeurId || undefined : undefined, extras, status: paid ? 'confirmed' : 'pending', total: q.total, paid: paid ? q.total : 0, deposit: q.deposit, channel, corporateId: customer?.corporateId },
          'staff',
        )
        toast.success(`Booking ${b.ref} created`)
        onDone(b)
      }
    } catch (e) {
      toast.error(e instanceof BookingConflictError ? e.message : 'Could not save the booking.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <AppField label="Customer" htmlFor="bf-c">
          <Select compact id="bf-c" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Select customer…</option>
            {[...s.customers].sort((a, b) => a.name.localeCompare(b.name)).map((c) => (
              <option key={c.id} value={c.id}>{c.name}{c.blacklist ? ' (blacklisted)' : c.verification !== 'verified' ? ` (${c.verification === 'none' ? 'not verified' : c.verification})` : ''}</option>
            ))}
          </Select>
        </AppField>
        <AppField label="City" htmlFor="bf-city">
          <Select compact id="bf-city" value={city} onChange={(e) => { setCity(e.target.value); setCarId(''); setPickup(''); setDropoff('') }}>
            {brand.cities.map((c) => <option key={c}>{c}</option>)}
          </Select>
        </AppField>
        <AppField label="Car" htmlFor="bf-car" className="sm:col-span-2">
          <Select compact id="bf-car" value={carId} onChange={(e) => { setCarId(e.target.value); const c = s.cars.find((x) => x.id === e.target.value); if (c && !c.modes.includes(mode)) setMode(c.modes[0]) }}>
            <option value="">Select car…</option>
            {s.cars.filter((c) => c.city === city).map((c) => {
              const free = datesOk && overlaps(s, c.id, start, end, existing?.id).length === 0 && bookability(c).ok
              return <option key={c.id} value={c.id}>{carName(c)} · {c.plate} · {naira(c.rates.daily)}/day{free ? '' : ' — unavailable'}</option>
            })}
          </Select>
        </AppField>
        <AppField label="Pick-up" htmlFor="bf-sd">
          <div className="grid grid-cols-[1fr_96px] gap-2">
            <Input compact id="bf-sd" type="date" value={startD} onChange={(e) => setStartD(e.target.value)} className="[color-scheme:dark]" />
            <Input compact type="time" value={startT} onChange={(e) => setStartT(e.target.value)} aria-label="Pick-up time" className="[color-scheme:dark]" />
          </div>
        </AppField>
        <AppField label="Return" htmlFor="bf-ed">
          <div className="grid grid-cols-[1fr_96px] gap-2">
            <Input compact id="bf-ed" type="date" value={endD} onChange={(e) => setEndD(e.target.value)} className="[color-scheme:dark]" />
            <Input compact type="time" value={endT} onChange={(e) => setEndT(e.target.value)} aria-label="Return time" className="[color-scheme:dark]" />
          </div>
        </AppField>
        <AppField label="Pick-up point" htmlFor="bf-pu">
          <Select compact id="bf-pu" value={pickup || locs[0]?.id} onChange={(e) => setPickup(e.target.value)}>
            {locs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </Select>
        </AppField>
        <AppField label="Return point" htmlFor="bf-do">
          <Select compact id="bf-do" value={dropoff || pickup || locs[0]?.id} onChange={(e) => setDropoff(e.target.value)}>
            {locs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </Select>
        </AppField>
        <AppField label="Drive" htmlFor="bf-mode">
          <Select compact id="bf-mode" value={mode} onChange={(e) => setMode(e.target.value as Booking['mode'])}>
            {(car?.modes ?? ['self-drive', 'chauffeur']).map((m) => <option key={m} value={m}>{m === 'self-drive' ? 'Self-drive' : 'Chauffeur'}</option>)}
          </Select>
        </AppField>
        {mode === 'chauffeur' ? (
          <AppField label="Chauffeur" htmlFor="bf-ch">
            <Select compact id="bf-ch" value={chauffeurId} onChange={(e) => setChauffeurId(e.target.value)}>
              <option value="">Assign later</option>
              {s.chauffeurs.filter((d) => d.city === city).map((d) => <option key={d.id} value={d.id}>{d.name}{d.available ? '' : ' (off)'}</option>)}
            </Select>
          </AppField>
        ) : (
          <AppField label="Channel" htmlFor="bf-chn">
            <Select compact id="bf-chn" value={channel} onChange={(e) => setChannel(e.target.value as Channel)} disabled={!!existing}>
              {['walk-in', 'phone', 'whatsapp', 'website', 'corporate'].map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </AppField>
        )}
      </div>
      <fieldset>
        <legend className="mb-1.5 text-xs font-semibold text-mute">Extras</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {EXTRAS.map((x) => (
            <label key={x.id} className="flex items-center gap-2 text-[13.5px]">
              <input type="checkbox" className="accent-[var(--brand-accent)]" checked={extras.includes(x.id)} onChange={() => setExtras((e) => (e.includes(x.id) ? e.filter((y) => y !== x.id) : [...e, x.id]))} />
              {x.id}
            </label>
          ))}
        </div>
      </fieldset>
      {!existing && (
        <label className="flex items-center gap-2 text-[13.5px]">
          <input type="checkbox" className="accent-[var(--brand-accent)]" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
          Payment and deposit received now (otherwise saved as pending)
        </label>
      )}
      <div className="border border-line bg-ink-3 p-3 text-[13.5px]" aria-live="polite">
        {errors.length ? (
          <ul className="flex flex-col gap-1">
            {errors.map((e) => <li key={e} className="flex gap-2 text-bad"><AlertTriangle className="mt-0.5 size-4 shrink-0" />{e}</li>)}
          </ul>
        ) : q ? (
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-ok"><CheckCircle2 className="size-4" /> Car is free · {q.days} day{q.days > 1 ? 's' : ''}</span>
            <span className="num">{naira(q.total)} <span className="text-mute">+ {naira(q.deposit)} deposit</span></span>
          </div>
        ) : null}
      </div>
      <div className="flex justify-end gap-2">
        <Button size="app" onClick={save} disabled={errors.length > 0} loading={saving}>{existing ? 'Save changes' : 'Create booking'}</Button>
      </div>
    </div>
  )
}
