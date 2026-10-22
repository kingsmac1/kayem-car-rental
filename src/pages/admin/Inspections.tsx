import { useMemo, useState } from 'react'
import { Camera, CheckCircle2, ClipboardCheck, Copy, Fuel, Gauge, ImagePlus, Loader2, Plus, ScanSearch, Send, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { brand } from '@/config/brand'
import { audit, currentStaff, db, useDb } from '@/lib/db'
import { addDays, cn, fmtDay, fmtTime, naira, waLink } from '@/lib/utils'
import { carName } from '@/mocks/cars'
import type { Booking, Car, Deduction, Inspection } from '@/mocks/types'
import { aiService } from '@/services/ai'
import { bookingService } from '@/services/bookings'
import { paymentService } from '@/services/payments'
import { notificationService } from '@/services/notifications'
import { images } from '@/data/images'
import { AdminTitle, BookingStatus } from '@/components/admin/kit'
import { DamageMarks, ImageCompare } from '@/components/admin/ImageCompare'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState, Panel, Pill, Progress } from '@/components/ui/misc'

const ANGLES = [
  { id: 'front', label: 'Front', prompt: 'Stand 3 steps back, centre the bumper and both headlights.' },
  { id: 'rear', label: 'Rear', prompt: 'Centre the rear bumper, plate and both tail-lights.' },
  { id: 'left', label: 'Left side', prompt: 'Whole left side in frame — both wheels visible.' },
  { id: 'right', label: 'Right side', prompt: 'Whole right side in frame — both wheels visible.' },
  { id: 'interior', label: 'Interior', prompt: 'From the back seat: front seats, dashboard and floor mats.' },
  { id: 'dashboard', label: 'Dashboard', prompt: 'Ignition on. Odometer and fuel gauge must be readable.' },
] as const
type AngleId = (typeof ANGLES)[number]['id']

const TANK: Record<Car['category'], number> = { Saloon: 50, SUV: 80, 'Luxury Saloon': 70, 'Luxury SUV': 90, Van: 70, Bus: 100 }
const FUEL_PRICE = 1100

function samplePhoto(car: Car, angle: AngleId) {
  if (angle === 'interior') return images.scenes.interior
  if (angle === 'dashboard') return images.scenes.mercWheel
  const i = { front: 0, rear: 1, left: 0, right: 2 }[angle] ?? 0
  return car.gallery[i] ?? car.image
}

interface Session {
  booking: Booking
  kind: 'check-out' | 'check-in'
  step: number
  photos: Partial<Record<AngleId, string>>
  mileage: number
  fuel: number
}

export default function Inspections() {
  const s = useDb((x) => x)
  const [session, setSession] = useState<Session | null>(null)
  const now = new Date()
  const checkOuts = s.bookings.filter((b) => b.status === 'confirmed' && new Date(b.start) < addDays(now, 2)).sort((a, b) => +new Date(a.start) - +new Date(b.start))
  const checkIns = s.bookings.filter((b) => b.status === 'active').sort((a, b) => +new Date(a.end) - +new Date(b.end))
  const carOf = (id: string) => s.cars.find((c) => c.id === id)!
  const custOf = (id: string) => s.customers.find((c) => c.id === id)

  const start = (b: Booking, kind: Session['kind']) => {
    const car = carOf(b.carId)
    const out = s.inspections.find((i) => i.bookingId === b.id && i.kind === 'check-out')
    setSession({ booking: b, kind, step: 0, photos: {}, mileage: kind === 'check-in' ? (out?.mileage ?? car.mileage) + 180 + Math.round(Math.random() * 300) : car.mileage, fuel: kind === 'check-in' ? 75 : 100 })
  }

  if (session) return <Walkaround session={session} setSession={setSession} />

  const Row = ({ b, kind }: { b: Booking; kind: Session['kind'] }) => {
    const car = carOf(b.carId)
    const late = kind === 'check-in' && new Date(b.end) < now
    return (
      <li className="flex flex-wrap items-center gap-3 border-b border-line py-3 last:border-0">
        <img src={car.image.replace('.webp', '-sm.webp')} alt="" className="aspect-[4/3] w-16 object-cover" />
        <div className="min-w-0 flex-1 text-[13.5px]">
          <p className="font-semibold">{carName(car)} <span className="num font-normal text-mute">{b.ref}</span></p>
          <p className="text-[12.5px] text-mute">{custOf(b.customerId)?.name} · {kind === 'check-out' ? `pick-up ${fmtDay(b.start)} ${fmtTime(b.start)}` : `due ${fmtDay(b.end)} ${fmtTime(b.end)}`}</p>
        </div>
        {late ? <BookingStatus status="active" overdue /> : null}
        <Button size="appSm" onClick={() => start(b, kind)} icon={<Camera className="size-3.5" />}>{kind === 'check-out' ? 'Start check-out' : 'Start check-in'}</Button>
      </li>
    )
  }

  return (
    <div>
      <AdminTitle title="Inspections" sub="Guided photo walkarounds at every handover. Check-ins are compared with check-out photos by AI." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title={`Check-ins (returns) · ${checkIns.length}`}>
          {checkIns.length ? <ul>{checkIns.slice(0, 8).map((b) => <Row key={b.id} b={b} kind="check-in" />)}</ul> : <p className="text-[13.5px] text-mute">No cars out right now.</p>}
        </Panel>
        <Panel title={`Check-outs (next 48h) · ${checkOuts.length}`}>
          {checkOuts.length ? <ul>{checkOuts.slice(0, 8).map((b) => <Row key={b.id} b={b} kind="check-out" />)}</ul> : <p className="text-[13.5px] text-mute">No pick-ups in the next 48 hours.</p>}
        </Panel>
      </div>
      <Panel title="Completed inspections" className="mt-6">
        {s.inspections.length ? (
          <ul>
            {[...s.inspections].reverse().map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-2.5 text-[13.5px] last:border-0">
                <span><Pill tone={i.kind === 'check-in' ? 'info' : 'accent'}>{i.kind}</Pill> <span className="ml-2 font-semibold">{carName(carOf(i.carId))}</span> <span className="text-mute">· {fmtDay(i.at)} · by {i.by}</span></span>
                <span className="text-mute">{i.damages.length ? <span className="text-bad">{i.damages.length} damage item{i.damages.length > 1 ? 's' : ''}</span> : 'No damage'} · {i.mileage.toLocaleString()} km · fuel {i.fuel}%</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<ClipboardCheck className="size-7" />} title="No inspections yet" body="Start a check-out or check-in above." />
        )}
      </Panel>
    </div>
  )
}

function Walkaround({ session, setSession }: { session: Session; setSession: (s: Session | null) => void }) {
  const s = useDb((x) => x)
  const b = session.booking
  const car = s.cars.find((c) => c.id === b.carId)!
  const customer = s.customers.find((c) => c.id === b.customerId)
  const isDash = session.step === ANGLES.length - 1
  const angle = ANGLES[Math.min(session.step, ANGLES.length - 1)]
  const done = session.step >= ANGLES.length
  const set = (patch: Partial<Session>) => setSession({ ...session, ...patch })

  const addPhoto = (url: string) => set({ photos: { ...session.photos, [angle.id]: url } })

  if (done && session.kind === 'check-in') return <Review session={session} car={car} onExit={() => setSession(null)} />

  if (done) {
    const finish = async () => {
      const insp: Inspection = { id: `i-${Date.now()}`, bookingId: b.id, carId: car.id, kind: 'check-out', at: new Date().toISOString(), by: currentStaff().name, mileage: session.mileage, fuel: session.fuel, photos: session.photos as Record<string, string>, damages: [], notes: '' }
      db.set((d) => {
        d.inspections.push(insp)
        const c = d.cars.find((x) => x.id === car.id)
        if (c) c.mileage = session.mileage
      })
      await bookingService.update(b.id, { status: 'active' })
      notificationService.send(customer?.phone ?? '', 'whatsapp', 'alert', `Check-out photos for ${b.ref} saved`)
      audit(`Completed check-out inspection for ${b.ref}`)
      toast.success(`${b.ref} checked out — rental is now active`)
      setSession(null)
    }
    return (
      <div>
        <AdminTitle title="Check-out complete" sub={`${carName(car)} · ${b.ref} · ${customer?.name}`} />
        <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
          {ANGLES.map((a) => <figure key={a.id}><img src={session.photos[a.id]} alt={a.label} className="aspect-[4/3] w-full object-cover" /><figcaption className="mt-1 text-[12px] text-mute">{a.label}</figcaption></figure>)}
        </div>
        <p className="mt-4 text-[14px]">Mileage <span className="num">{session.mileage.toLocaleString()} km</span> · fuel <span className="num">{session.fuel}%</span></p>
        <div className="mt-6 flex gap-2"><Button size="app" onClick={finish}>Hand over keys & start rental</Button><Button size="app" variant="subtle" onClick={() => set({ step: 0 })}>Retake</Button></div>
      </div>
    )
  }

  return (
    <div>
      <AdminTitle title={`${session.kind === 'check-out' ? 'Check-out' : 'Check-in'} walkaround`} sub={`${carName(car)} · ${car.plate} · ${b.ref} · ${customer?.name}`}>
        <Button size="app" variant="subtle" onClick={() => setSession(null)}>Exit</Button>
      </AdminTitle>
      <ol className="mb-6 grid grid-cols-6 gap-1">
        {ANGLES.map((a, i) => (
          <li key={a.id}>
            <Progress value={session.photos[a.id] ? 100 : i === session.step ? 40 : 0} tone={session.photos[a.id] ? 'ok' : 'accent'} />
            <p className={cn('mt-1 truncate text-[11.5px]', i === session.step ? 'font-semibold' : 'text-mute')}>{a.label}</p>
          </li>
        ))}
      </ol>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="relative aspect-[16/10] overflow-hidden border border-line bg-ink-3">
          {session.photos[angle.id] ? (
            <img src={session.photos[angle.id]} alt={angle.label} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-center text-mute">
              <div>
                <Camera className="mx-auto size-10" />
                <p className="mt-2 text-[14px]">{angle.label}</p>
              </div>
            </div>
          )}
          {/* Framing guide */}
          <div className="pointer-events-none absolute inset-[10%] border-2 border-dashed border-accent/50" aria-hidden />
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-semibold text-mute">Step {session.step + 1} of {ANGLES.length}</p>
            <h2 className="mt-1 text-xl font-bold">{angle.label}</h2>
            <p className="mt-2 text-[14px] text-paper/80">{angle.prompt}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-[2px] bg-accent px-3.5 text-[13px] font-semibold text-accent-ink">
              <Camera className="size-4" /> Take photo
              <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) addPhoto(URL.createObjectURL(f)) }} />
            </label>
            <Button size="app" variant="subtle" icon={<ImagePlus className="size-4" />} onClick={() => addPhoto(samplePhoto(car, angle.id))}>Use sample photo (demo)</Button>
          </div>
          {isDash && (
            <div className="grid gap-3 border border-line p-3">
              <label className="flex flex-col gap-1 text-[13px]"><span className="flex items-center gap-1.5 text-mute"><Gauge className="size-3.5" />Odometer (km)</span><Input compact type="number" value={session.mileage} onChange={(e) => set({ mileage: Number(e.target.value) })} /></label>
              <label className="flex flex-col gap-1 text-[13px]"><span className="flex items-center justify-between text-mute"><span className="flex items-center gap-1.5"><Fuel className="size-3.5" />Fuel level</span><span className="num text-paper">{session.fuel}%</span></span><input type="range" min={0} max={100} step={5} value={session.fuel} onChange={(e) => set({ fuel: Number(e.target.value) })} className="accent-[var(--brand-accent)]" /></label>
            </div>
          )}
          <div className="mt-auto flex gap-2">
            {session.step > 0 && <Button size="app" variant="subtle" onClick={() => set({ step: session.step - 1 })}>Back</Button>}
            <Button size="app" disabled={!session.photos[angle.id]} onClick={() => set({ step: session.step + 1 })}>{isDash ? (session.kind === 'check-in' ? 'Compare with check-out' : 'Review') : 'Next angle'}</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

type Flag = { angle: AngleId; x: number; y: number; label: string; severity: 'minor' | 'moderate' | 'major'; cost: number; confidence: number; accepted: boolean }

function Review({ session, car, onExit }: { session: Session; car: Car; onExit: () => void }) {
  const s = useDb((x) => x)
  const b = session.booking
  const customer = s.customers.find((c) => c.id === b.customerId)
  const out = s.inspections.find((i) => i.bookingId === b.id && i.kind === 'check-out')
  const [flags, setFlags] = useState<Flag[] | null>(null)
  const [scanning, setScanning] = useState(false)
  const [angle, setAngle] = useState<AngleId>('right')
  const [fines, setFines] = useState<{ label: string; amount: number }[]>([])
  const [fineLabel, setFineLabel] = useState('')
  const [fineAmt, setFineAmt] = useState('')
  const [saving, setSaving] = useState(false)
  const [sent, setSent] = useState(false)

  const scan = async () => {
    setScanning(true)
    const seed = Number(b.ref.replace(/\D/g, '')) || 7
    const all: Flag[] = []
    for (const a of ANGLES) {
      const hits = await aiService.detectDamage(a.id, seed)
      all.push(...hits.map((h) => ({ ...h, angle: a.id, accepted: true })))
      if (a.id === 'left') setFlags([...all])
    }
    setFlags(all)
    setScanning(false)
  }

  const beforeFuel = out?.fuel ?? 100
  const lateHours = Math.max(0, Math.ceil((Date.now() - new Date(b.end).getTime() - s.settings.graceMinutes * 60000) / 3600000))
  const charges = useMemo(() => {
    const lines: Deduction[] = []
    for (const f of flags ?? []) if (f.accepted) lines.push({ label: f.label, amount: f.cost, kind: 'damage', photo: session.photos[f.angle] })
    const shortfall = Math.max(0, beforeFuel - session.fuel)
    if (shortfall > 0) lines.push({ label: `Fuel shortfall ${shortfall}% (${Math.round((TANK[car.category] * shortfall) / 100)} L)`, amount: Math.round((TANK[car.category] * shortfall) / 100) * FUEL_PRICE + 5000, kind: 'fuel' })
    if (lateHours > 0) lines.push({ label: `Late return (${lateHours} h)`, amount: lateHours * s.settings.lateFeePerHour, kind: 'late' })
    for (const f of fines) lines.push({ label: f.label, amount: f.amount, kind: 'fine' })
    return lines
  }, [flags, beforeFuel, session.fuel, session.photos, car.category, lateHours, s.settings, fines])
  const total = charges.reduce((a, c) => a + c.amount, 0)
  const deducted = Math.min(total, b.deposit)
  const extraOwed = Math.max(0, total - b.deposit)
  const refund = b.deposit - deducted
  const angleFlags = (flags ?? []).map((f, i) => ({ ...f, i })).filter((f) => f.angle === angle)
  const beforePhoto = out?.photos[angle] ?? samplePhoto(car, angle)
  const summary = `${brand.name} — return summary for ${b.ref}\n${carName(car)} (${car.plate})\nReturned ${fmtDay(new Date())}, ${session.mileage.toLocaleString()} km, fuel ${session.fuel}%\n\n${charges.length ? charges.map((c) => `• ${c.label}: ${naira(c.amount)}`).join('\n') : '• No charges — thank you!'}\n\nDeposit ${naira(b.deposit)} → refund ${naira(refund)}${extraOwed ? `\nBalance to pay: ${naira(extraOwed)}` : ''}\nPhotos of every item are in your account.`

  const complete = async () => {
    setSaving(true)
    const insp: Inspection = {
      id: `i-${Date.now()}`, bookingId: b.id, carId: car.id, kind: 'check-in', at: new Date().toISOString(), by: currentStaff().name, mileage: session.mileage, fuel: session.fuel,
      photos: session.photos as Record<string, string>, damages: (flags ?? []).filter((f) => f.accepted).map((f) => ({ angle: f.angle, x: f.x, y: f.y, label: f.label, severity: f.severity, cost: f.cost, ai: true })), notes: '',
    }
    db.set((d) => {
      d.inspections.push(insp)
      const c = d.cars.find((x) => x.id === car.id)
      if (c) {
        c.mileage = session.mileage
        c.fuelLevel = session.fuel
      }
    })
    await bookingService.update(b.id, { status: 'returned' })
    await paymentService.deductDeposit(b.id, charges)
    await bookingService.update(b.id, { status: 'closed' })
    if (customer) await notificationService.send(customer.phone, 'whatsapp', 'deposit_refunded', summary)
    setSaving(false)
    setSent(true)
    toast.success(`${b.ref} closed — ${naira(refund)} refunded`)
  }

  return (
    <div>
      <AdminTitle title="Check-in review" sub={`${carName(car)} · ${b.ref} · ${customer?.name}`}>
        <Button size="app" variant="subtle" onClick={onExit}>{sent ? 'Back to inspections' : 'Exit'}</Button>
      </AdminTitle>
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div>
          <div className="mb-3 flex flex-wrap gap-1">
            {ANGLES.map((a) => {
              const n = (flags ?? []).filter((f) => f.angle === a.id && f.accepted).length
              return (
                <button key={a.id} type="button" onClick={() => setAngle(a.id)} className={cn('rounded-[2px] border px-2.5 py-1.5 text-[12.5px] font-semibold', angle === a.id ? 'border-accent bg-accent/10 text-accent' : 'border-line text-mute hover:text-paper')}>
                  {a.label}{n ? <span className="ml-1.5 rounded-full bg-bad px-1.5 text-[11px] text-ink">{n}</span> : null}
                </button>
              )
            })}
          </div>
          <ImageCompare
            before={beforePhoto}
            after={session.photos[angle] ?? beforePhoto}
            afterFilter="contrast(1.05) saturate(.9)"
            overlay={flags ? <DamageMarks marks={angleFlags} accepted={angleFlags.map((f) => f.accepted)} onToggle={(i) => setFlags((fl) => fl!.map((f, k) => (k === angleFlags[i].i ? { ...f, accepted: !f.accepted } : f)))} /> : null}
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {!flags ? (
              <Button size="app" onClick={scan} loading={scanning} icon={<ScanSearch className="size-4" />}>Run AI damage check</Button>
            ) : (
              <p className="flex items-center gap-2 text-[13.5px]">{scanning ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4 text-ok" />}{scanning ? 'Scanning all angles…' : `AI flagged ${flags.length} possible new damage item${flags.length === 1 ? '' : 's'}. Tap a marker to dismiss or restore it.`}</p>
            )}
          </div>
          <p className="mt-2 text-[12px] text-mute">Simulated vision check (demo). In production a vision model compares each check-out and check-in photo.</p>
        </div>

        <Panel title="Charges & deposit">
          <ul className="flex flex-col text-[13.5px]">
            {charges.map((c, i) => (
              <li key={i} className="flex items-center justify-between gap-3 border-b border-line py-2">
                <span><Pill tone={c.kind === 'damage' ? 'bad' : 'warn'} className="mr-2 capitalize">{c.kind}</Pill>{c.label}</span>
                <span className="flex items-center gap-2">
                  <span className="num">{naira(c.amount)}</span>
                  {c.kind === 'fine' && <button type="button" aria-label="Remove fine" onClick={() => setFines((f) => f.filter((x) => x.label !== c.label))} className="text-mute hover:text-bad"><Trash2 className="size-3.5" /></button>}
                </span>
              </li>
            ))}
            {!charges.length && <li className="py-2 text-mute">No charges yet{flags ? '' : ' — run the AI check'}.</li>}
          </ul>
          <div className="mt-3 flex gap-2">
            <Input compact placeholder="Fine, e.g. LASTMA ticket" value={fineLabel} onChange={(e) => setFineLabel(e.target.value)} aria-label="Fine description" />
            <Input compact type="number" placeholder="₦" value={fineAmt} onChange={(e) => setFineAmt(e.target.value)} className="w-28" aria-label="Fine amount" />
            <Button size="app" variant="subtle" aria-label="Add fine" disabled={!fineLabel || !Number(fineAmt)} onClick={() => { setFines((f) => [...f, { label: fineLabel, amount: Number(fineAmt) }]); setFineLabel(''); setFineAmt('') }}><Plus className="size-4" /></Button>
          </div>
          <dl className="mt-4 flex flex-col gap-1.5 border-t border-line pt-3 text-[13.5px]">
            <div className="flex justify-between"><dt className="text-mute">Fuel out → in</dt><dd className="num">{beforeFuel}% → {session.fuel}%</dd></div>
            <div className="flex justify-between"><dt className="text-mute">Total charges</dt><dd className="num">{naira(total)}</dd></div>
            <div className="flex justify-between"><dt className="text-mute">Deposit held</dt><dd className="num">{naira(b.deposit)}</dd></div>
            <div className="flex justify-between font-semibold"><dt>Refund to customer</dt><dd className="num text-ok">{naira(refund)}</dd></div>
            {extraOwed > 0 && <div className="flex justify-between font-semibold text-bad"><dt>Customer still owes</dt><dd className="num">{naira(extraOwed)}</dd></div>}
          </dl>
          <div className="mt-4 border border-line bg-ink-3 p-3">
            <p className="mb-1.5 text-xs font-semibold text-mute">Summary for the customer</p>
            <pre className="whitespace-pre-wrap font-body text-[12.5px] leading-relaxed">{summary}</pre>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {!sent ? (
              <Button size="app" onClick={complete} loading={saving} disabled={!flags || scanning} icon={<Send className="size-4" />}>Deduct & send summary</Button>
            ) : (
              <Pill tone="ok"><CheckCircle2 className="size-3.5" /> Sent to {customer?.name} on WhatsApp</Pill>
            )}
            <Button size="app" variant="subtle" icon={<Copy className="size-4" />} onClick={() => { navigator.clipboard?.writeText(summary); toast.success('Summary copied') }}>Copy</Button>
            <Button size="app" variant="subtle" asChild><a href={waLink(summary).replace(/wa\.me\/\d+/, `wa.me/${(customer?.phone ?? '').replace(/\D/g, '')}`)} target="_blank" rel="noreferrer">Open in WhatsApp</a></Button>
          </div>
        </Panel>
      </div>
    </div>
  )
}
