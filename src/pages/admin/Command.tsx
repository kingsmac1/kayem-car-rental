import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { Circle, MapContainer, Marker, Polyline, TileLayer, Tooltip as LTooltip, useMap, useMapEvents } from 'react-leaflet'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Copy, Crosshair, Fuel, Gauge, History, Lock, MapPin, Moon, Pause, Play, Share2, ShieldAlert, Unlock, User, X, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { brand, type City } from '@/config/brand'
import { mapTiles } from '@/config/map'
import { audit, db, useDb } from '@/lib/db'
import { cn, timeAgo, waLink } from '@/lib/utils'
import { carName } from '@/mocks/cars'
import { cityCentre } from '@/mocks/locations'
import type { Car } from '@/mocks/types'
import { defaultGeofences, type Geofence, onTripCarIds, type Position, trackingService } from '@/services/tracking'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input, Select } from '@/components/ui/input'
import { Pill } from '@/components/ui/misc'
import { Segmented } from '@/components/admin/kit'

const FENCE_KEY = 'rentalos:geofences'
const loadFences = (): Geofence[] => {
  try {
    return JSON.parse(localStorage.getItem(FENCE_KEY) ?? 'null') ?? defaultGeofences
  } catch {
    return defaultGeofences
  }
}

function carIcon(p: Position, selected: boolean, alert: boolean) {
  const color = p.immobilised ? '#FF5A4E' : alert ? '#FF5A4E' : p.moving ? brand.colors.accent : '#9C988E'
  const size = selected ? 34 : 26
  const html = `<div style="width:${size}px;height:${size}px;position:relative;">
    ${p.moving ? `<div style="position:absolute;inset:-8px;border-radius:50%;background:${color};opacity:.18;"></div>` : ''}
    <div style="position:absolute;inset:0;border-radius:50%;background:#0A0A09;border:2px solid ${color};display:grid;place-items:center;box-shadow:0 2px 8px rgba(0,0,0,.6)">
      ${p.immobilised
        ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="3"><rect x="5" y="11" width="14" height="10" rx="1"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`
        : p.moving
          ? `<svg width="13" height="13" viewBox="0 0 24 24" style="transform:rotate(${90 - p.heading}deg)"><path d="M4 12h14M13 6l6 6-6 6" stroke="${color}" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`
          : `<div style="width:7px;height:7px;border-radius:50%;background:${color}"></div>`}
    </div></div>`
  return L.divIcon({ html, className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2] })
}

/** Flies only when `k` changes (new city or newly selected car), not on every position tick. */
function FlyTo({ center, zoom, k }: { center: [number, number]; zoom: number; k: string }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.2 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k, map])
  return null
}

function DrawFence({ active, onPick }: { active: boolean; onPick: (ll: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      if (active) onPick([e.latlng.lat, e.latlng.lng])
    },
  })
  return null
}

export default function Command() {
  const s = useDb((x) => x)
  const [now, setNow] = useState(Date.now())
  const [city, setCity] = useState<City>('Lagos')
  const [selected, setSelected] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'moving' | 'parked' | 'alerts'>('all')
  const [fences, setFences] = useState<Geofence[]>(loadFences)
  const [drawing, setDrawing] = useState(false)
  const [draft, setDraft] = useState<{ center: [number, number]; radiusKm: number } | null>(null)
  const [replay, setReplay] = useState<{ carId: string; t: number; playing: boolean } | null>(null)
  const [immo, setImmo] = useState<Car | null>(null)
  const [share, setShare] = useState<Car | null>(null)
  const seen = useRef(new Map<string, Set<string>>())

  // Live tick every second.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const positions = useMemo(() => trackingService.livePositions(s, now, fences), [s, now, fences])
  const onTrip = useMemo(() => onTripCarIds(s), [s])
  const byId = useMemo(() => new Map(positions.map((p) => [p.carId, p])), [positions])

  // Event detection: geofence exit, overspeed, late-night use → alerts (once per car per event per session).
  useEffect(() => {
    const hour = new Date(now).getHours()
    for (const p of positions) {
      const car = s.cars.find((c) => c.id === p.carId)!
      const fired = seen.current.get(p.carId) ?? new Set<string>()
      const fire = (key: string, level: 'warn' | 'bad', kind: 'geofence' | 'overspeed' | 'night' | 'harsh', text: string) => {
        if (fired.has(key)) return
        fired.add(key)
        seen.current.set(p.carId, fired)
        db.set((d) => {
          d.alerts.unshift({ id: `al-${Date.now()}-${key}-${p.carId}`, at: new Date().toISOString(), level, kind, carId: p.carId, text, read: false })
        })
        toast.warning(text)
      }
      if (!p.insideGeofence && p.moving) fire('geofence', 'bad', 'geofence', `${carName(car)} left its approved area (${p.road}).`)
      if (p.speed > 120) fire('overspeed', 'warn', 'overspeed', `${carName(car)} is doing ${p.speed} km/h on ${p.road}.`)
      if (p.moving && (hour >= 0 && hour < 5)) fire('night', 'warn', 'night', `${carName(car)} is being driven late at night (${new Date(now).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}).`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions])

  const cityCars = s.cars.filter((c) => c.city === city)
  const alertCars = new Set(s.alerts.filter((a) => !a.read && a.carId).map((a) => a.carId!))
  const list = cityCars.filter((c) => {
    const p = byId.get(c.id)!
    return filter === 'all' || (filter === 'moving' ? p.moving : filter === 'parked' ? !p.moving : alertCars.has(c.id) || !p.insideGeofence)
  })
  const sel = s.cars.find((c) => c.id === selected)
  const selPos = sel ? byId.get(sel.id) : undefined
  const fence = fences.find((f) => f.city === city)
  const trip = useMemo(() => (replay ? trackingService.tripHistory(s.cars.find((c) => c.id === replay.carId)!, 20, now) : null), [replay?.carId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Replay playback.
  useEffect(() => {
    if (!replay?.playing || !trip) return
    const t = setInterval(() => setReplay((r) => (r ? { ...r, t: r.t >= trip.length - 1 ? 0 : r.t + 1 } : r)), 120)
    return () => clearInterval(t)
  }, [replay?.playing, trip])

  const saveFence = () => {
    if (!draft) return
    const next = [...fences.filter((f) => f.city !== city), { id: `gf-${city}`, city, name: `${city} — custom area`, center: draft.center, radiusKm: draft.radiusKm }]
    setFences(next)
    try {
      localStorage.setItem(FENCE_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
    seen.current.forEach((set) => set.delete('geofence'))
    setDraft(null)
    setDrawing(false)
    audit(`Updated ${city} geofence (${draft.radiusKm} km)`)
    toast.success('Geofence saved. Cars outside it will trigger alerts.')
  }

  const booking = sel ? s.bookings.find((b) => b.carId === sel.id && b.status === 'active') : undefined
  const customer = booking ? s.customers.find((c) => c.id === booking.customerId) : undefined
  const driver = booking?.chauffeurId ? s.chauffeurs.find((d) => d.id === booking.chauffeurId) : undefined

  return (
    <div className="-mx-4 -my-6 grid h-[calc(100dvh-56px)] grid-rows-[auto_1fr] md:-mx-6 md:-my-8 lg:grid-cols-[320px_1fr] lg:grid-rows-1">
      {/* Side panel */}
      <aside className="flex max-h-[38vh] flex-col overflow-hidden border-b border-line bg-ink-2 lg:max-h-none lg:border-b-0 lg:border-r">
        <div className="flex flex-col gap-3 border-b border-line p-3">
          <div className="flex items-center justify-between">
            <h1 className="text-[17px] font-bold">Fleet Command</h1>
            <span className="flex items-center gap-1.5 text-[12px] text-ok"><span className="size-2 animate-[pulseDot_1.4s_ease-in-out_infinite] rounded-full bg-ok" />Live</span>
          </div>
          <Segmented label="City" value={city} onChange={(c) => { setCity(c); setSelected(null); setReplay(null) }} options={brand.cities.map((c) => ({ id: c, label: c === 'Port Harcourt' ? 'PH' : c }))} />
          <Segmented label="Filter" value={filter} onChange={setFilter} options={[{ id: 'all', label: 'All' }, { id: 'moving', label: 'Moving' }, { id: 'parked', label: 'Parked' }, { id: 'alerts', label: 'Alerts' }]} />
        </div>
        <ul className="flex-1 overflow-y-auto" data-lenis-prevent>
          {list.map((c) => {
            const p = byId.get(c.id)!
            return (
              <li key={c.id}>
                <button type="button" onClick={() => { setSelected(c.id); setReplay(null) }} className={cn('flex w-full items-center gap-3 border-b border-line px-3 py-2.5 text-left hover:bg-paper/[0.03]', selected === c.id && 'bg-accent/10')}>
                  <span className={cn('size-2.5 shrink-0 rounded-full', p.immobilised || !p.insideGeofence ? 'bg-bad' : p.moving ? 'bg-accent' : 'bg-mute')} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold">{carName(c)}</span>
                    <span className="block truncate text-[12px] text-mute">{p.road}</span>
                  </span>
                  <span className={cn('num text-[13px]', p.speed > 120 ? 'text-bad' : 'text-paper')}>{p.speed}<span className="text-[10px] text-mute"> km/h</span></span>
                </button>
              </li>
            )
          })}
          {!list.length && <li className="p-4 text-[13px] text-mute">No cars match this filter.</li>}
        </ul>
        <div className="hidden border-t border-line lg:block">
          <p className="px-3 pt-3 text-xs font-semibold text-mute">Recent alerts</p>
          <ul className="max-h-48 overflow-y-auto px-3 pb-3" data-lenis-prevent>
            {s.alerts.filter((a) => ['overspeed', 'geofence', 'harsh', 'night'].includes(a.kind)).slice(0, 8).map((a) => (
              <li key={a.id} className="flex gap-2 border-b border-line py-2 text-[12.5px] last:border-0">
                {a.kind === 'night' ? <Moon className="mt-0.5 size-3.5 shrink-0 text-warn" /> : a.kind === 'overspeed' ? <Zap className="mt-0.5 size-3.5 shrink-0 text-warn" /> : <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-bad" />}
                <span>{a.text}<span className="block text-[11px] text-mute">{timeAgo(a.at)}</span></span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Map */}
      <div className="relative min-h-[360px]">
        <MapContainer center={cityCentre.Lagos} zoom={11} maxZoom={mapTiles.maxZoom} className="h-full w-full" zoomControl preferCanvas>
          <TileLayer attribution={mapTiles.attribution} url={mapTiles.base} maxZoom={mapTiles.maxZoom} />
          {mapTiles.labels && <TileLayer url={mapTiles.labels} maxZoom={mapTiles.maxZoom} />}
          <FlyTo k={`${city}|${selected ?? ''}|${replay ? 'r' : ''}`} center={selPos && !replay ? [selPos.lat, selPos.lng] : cityCentre[city]} zoom={selPos && !replay ? 13 : city === 'Port Harcourt' ? 10 : 11} />
          <DrawFence active={drawing} onPick={(ll) => setDraft({ center: ll, radiusKm: draft?.radiusKm ?? 15 })} />
          {fence && !draft && <Circle center={fence.center} radius={fence.radiusKm * 1000} pathOptions={{ color: brand.colors.accent, weight: 1, dashArray: '6 6', fillOpacity: 0.04 }} />}
          {draft && <Circle center={draft.center} radius={draft.radiusKm * 1000} pathOptions={{ color: brand.colors.ok, weight: 2, fillOpacity: 0.08 }} />}
          {trip && (
            <>
              <Polyline positions={trip.map((t) => [t.lat, t.lng] as [number, number])} pathOptions={{ color: brand.colors.accent, weight: 3, opacity: 0.8 }} />
              <Marker position={[trip[replay!.t].lat, trip[replay!.t].lng]} icon={carIcon({ ...selPos!, moving: true, heading: 0, speed: trip[replay!.t].speed }, true, false)} />
            </>
          )}
          {!replay &&
            cityCars.map((c) => {
              const p = byId.get(c.id)!
              return (
                <Marker key={c.id} position={[p.lat, p.lng]} icon={carIcon(p, selected === c.id, !p.insideGeofence || p.speed > 120)} eventHandlers={{ click: () => setSelected(c.id) }}>
                  <LTooltip direction="top" offset={[0, -14]}>{carName(c)} · {p.speed} km/h</LTooltip>
                </Marker>
              )
            })}
        </MapContainer>

        {/* Geofence tools */}
        <div className="absolute right-3 top-3 z-[500] flex flex-col items-end gap-2">
          {!drawing ? (
            <Button size="appSm" variant="subtle" icon={<Crosshair className="size-3.5" />} onClick={() => { setDrawing(true); setSelected(null); setReplay(null) }}>Edit geofence</Button>
          ) : (
            <div className="w-64 border border-line bg-ink-2 p-3 text-[12.5px] shadow-lg">
              <p className="font-semibold">Draw approved area — {city}</p>
              <p className="mt-1 text-mute">{draft ? 'Adjust the radius, then save.' : 'Click the map to place the centre.'}</p>
              {draft && (
                <label className="mt-3 block">
                  <span className="flex justify-between"><span>Radius</span><span className="num">{draft.radiusKm} km</span></span>
                  <input type="range" min={3} max={60} value={draft.radiusKm} onChange={(e) => setDraft({ ...draft, radiusKm: Number(e.target.value) })} className="mt-1 w-full accent-[var(--brand-accent)]" />
                </label>
              )}
              <div className="mt-3 flex gap-2">
                <Button size="appSm" disabled={!draft} onClick={saveFence}>Save area</Button>
                <Button size="appSm" variant="subtle" onClick={() => { setDrawing(false); setDraft(null) }}>Cancel</Button>
              </div>
            </div>
          )}
          {fence && !drawing && <span className="bg-ink/80 px-2 py-1 text-[11.5px] text-mute">{fence.name} · {fence.radiusKm} km</span>}
        </div>

        {/* Selected car panel */}
        {sel && selPos && (
          <div className="absolute bottom-3 left-3 right-3 z-[500] max-h-[70%] overflow-y-auto border border-line bg-ink-2/95 p-4 shadow-[0_12px_32px_-8px_rgba(0,0,0,.7)] backdrop-blur md:left-auto md:w-[380px]" data-lenis-prevent>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold">{carName(sel)}</p>
                <p className="text-[12.5px] text-mute">{sel.plate} · {selPos.road}</p>
              </div>
              <button type="button" onClick={() => { setSelected(null); setReplay(null) }} aria-label="Close" className="text-mute hover:text-paper"><X className="size-4" /></button>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {selPos.immobilised && <Pill tone="bad"><Lock className="size-3" />Immobilised</Pill>}
              {!selPos.insideGeofence && <Pill tone="bad"><AlertTriangle className="size-3" />Outside geofence</Pill>}
              {selPos.speed > 120 && <Pill tone="warn"><Zap className="size-3" />Overspeeding</Pill>}
              {selPos.moving ? <Pill tone="accent" dot>Moving</Pill> : <Pill tone="mute">Stopped</Pill>}
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-[12.5px]">
              <div className="border border-line p-2"><dt className="flex items-center gap-1 text-mute"><Gauge className="size-3" />Speed</dt><dd className={cn('num mt-1 text-[17px]', selPos.speed > 120 && 'text-bad')}>{selPos.speed}<span className="text-[11px] text-mute"> km/h</span></dd></div>
              <div className="border border-line p-2"><dt className="flex items-center gap-1 text-mute"><Fuel className="size-3" />Fuel</dt><dd className="num mt-1 text-[17px]">{selPos.fuel}%</dd></div>
              <div className="border border-line p-2"><dt className="text-mute">Mileage</dt><dd className="num mt-1 text-[15px]">{sel.mileage.toLocaleString()}</dd></div>
            </dl>
            <p className="mt-3 flex items-center gap-2 text-[13px]">
              <User className="size-4 text-mute" />
              {booking ? <>{driver ? `Chauffeur ${driver.name} · ` : ''}{customer?.name} <span className="num text-mute">({booking.ref})</span></> : <span className="text-mute">No active rental — parked at base</span>}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {onTrip.has(sel.id) && (
                <Button size="appSm" variant="subtle" icon={<History className="size-3.5" />} onClick={() => setReplay(replay ? null : { carId: sel.id, t: 0, playing: true })}>{replay ? 'Back to live' : 'Replay last 20 min'}</Button>
              )}
              <Button size="appSm" variant="subtle" icon={<Share2 className="size-3.5" />} onClick={() => setShare(sel)}>Share location</Button>
              {selPos.immobilised ? (
                <Button size="appSm" variant="subtle" icon={<Unlock className="size-3.5" />} onClick={async () => { await trackingService.release(sel.id); audit(`Released immobiliser on ${carName(sel)}`); toast.success('Immobiliser released'); setNow(Date.now()) }}>Release</Button>
              ) : (
                <Button size="appSm" variant="danger" icon={<Lock className="size-3.5" />} onClick={() => setImmo(sel)}>Immobilise</Button>
              )}
            </div>
            {replay && trip && (
              <div className="mt-4 border-t border-line pt-3">
                <div className="flex items-center gap-2">
                  <Button size="appSm" variant="subtle" onClick={() => setReplay({ ...replay, playing: !replay.playing })} aria-label={replay.playing ? 'Pause replay' : 'Play replay'}>{replay.playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}</Button>
                  <input type="range" min={0} max={trip.length - 1} value={replay.t} onChange={(e) => setReplay({ ...replay, t: Number(e.target.value), playing: false })} className="flex-1 accent-[var(--brand-accent)]" aria-label="Replay position" />
                </div>
                <p className="mt-1 flex justify-between text-[12px] text-mute"><span>{new Date(trip[replay.t].at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span><span className="num">{trip[replay.t].speed} km/h</span></p>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={!!immo} onOpenChange={(o) => !o && setImmo(null)}>
        {immo && <ImmobiliseDialog car={immo} onTrip={onTrip.has(immo.id)} onClose={() => { setImmo(null); setNow(Date.now()) }} />}
      </Dialog>
      <Dialog open={!!share} onOpenChange={(o) => !o && setShare(null)}>
        {share && <ShareDialog car={share} pos={byId.get(share.id)!} />}
      </Dialog>
    </div>
  )
}

function ImmobiliseDialog({ car, onTrip, onClose }: { car: Car; onTrip: boolean; onClose: () => void }) {
  const [step, setStep] = useState<1 | 2>(1)
  const [reason, setReason] = useState('Car reported stolen')
  const [typed, setTyped] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  const send = async () => {
    setSending(true)
    const r = await trackingService.immobilise(car, onTrip)
    setSending(false)
    setResult(r)
    audit(r.ok ? `Immobilised ${carName(car)} — ${reason}` : `Immobiliser refused for ${carName(car)} (moving)`)
    if (r.ok) toast.success('Immobiliser command delivered')
  }
  return (
    <DialogContent title="Remote immobiliser" description={`${carName(car)} · ${car.plate}`}>
      {result ? (
        <div className="flex flex-col gap-4 text-[14px]">
          <div className={cn('flex gap-3 border p-4', result.ok ? 'border-ok/40 bg-ok/8' : 'border-warn/40 bg-warn/8')}>
            {result.ok ? <Lock className="size-5 shrink-0 text-ok" /> : <ShieldAlert className="size-5 shrink-0 text-warn" />}
            <p>{result.message}</p>
          </div>
          <Button size="app" onClick={onClose}>Done</Button>
        </div>
      ) : step === 1 ? (
        <div className="flex flex-col gap-4 text-[14px]">
          <p className="border border-warn/40 bg-warn/8 p-3 text-[13.5px]">Step 1 of 2. Only use this for theft, a geofence breach or a customer who can’t be reached. The engine is only cut when the car is below 5 km/h — never while moving.</p>
          <label className="flex flex-col gap-1.5"><span className="text-xs font-semibold text-mute">Reason</span>
            <Select compact value={reason} onChange={(e) => setReason(e.target.value)}>
              {['Car reported stolen', 'Left approved area without permission', 'Customer unreachable and overdue', 'Police / recovery request'].map((r) => <option key={r}>{r}</option>)}
            </Select>
          </label>
          <Button size="app" onClick={() => setStep(2)}>Continue</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 text-[14px]">
          <p>Step 2 of 2. Type the plate <span className="num font-semibold">{car.plate}</span> to confirm.</p>
          <Input compact value={typed} onChange={(e) => setTyped(e.target.value.toUpperCase())} placeholder={car.plate} aria-label="Type the plate to confirm" />
          <div className="flex gap-2">
            <Button size="app" variant="danger" disabled={typed !== car.plate} loading={sending} onClick={send}>Send immobilise command</Button>
            <Button size="app" variant="subtle" onClick={() => setStep(1)}>Back</Button>
          </div>
        </div>
      )}
    </DialogContent>
  )
}

function ShareDialog({ car, pos }: { car: Car; pos: Position }) {
  const link = useMemo(() => trackingService.shareLink(car.id), [car.id])
  const text = `${brand.name} vehicle location — ${carName(car)} (${car.plate}), ${car.colour}. Live link (valid 24h): ${link} · Last fix ${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`
  return (
    <DialogContent title="Share live location" description="For police or a recovery team. The link expires in 24 hours.">
      <div className="flex flex-col gap-4 text-[14px]">
        <div className="border border-line bg-ink-3 p-3">
          <p className="flex items-center gap-2"><MapPin className="size-4 text-accent" /><span className="num">{pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}</span></p>
          <p className="mt-1 break-all text-[13px] text-[#53bdeb]">{link}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="app" icon={<Copy className="size-4" />} onClick={() => { navigator.clipboard?.writeText(text); toast.success('Location link copied'); audit(`Shared live location of ${carName(car)}`) }}>Copy link</Button>
          <Button size="app" variant="subtle" asChild><a href={waLink(text).replace(/wa\.me\/\d+/, 'wa.me/')} target="_blank" rel="noreferrer">Send on WhatsApp</a></Button>
        </div>
      </div>
    </DialogContent>
  )
}
