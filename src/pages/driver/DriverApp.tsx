import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { MapContainer, Marker, Polyline, TileLayer } from 'react-leaflet'
import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, CalendarDays, Car, CheckCircle2, Clock, Home, MapPin, MessageCircle, Navigation, Phone, Plane, Star, Timer, User, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { brand } from '@/config/brand'
import { mapTiles } from '@/config/map'
import { db, setSession, useDb, useSession } from '@/lib/db'
import { addDays, cn, fmtDay, fmtTime, isoDate, naira, relDay, startOfDay } from '@/lib/utils'
import { carName } from '@/mocks/cars'
import { locationById, locationName, locations } from '@/mocks/locations'
import type { Booking } from '@/mocks/types'
import { bookingService } from '@/services/bookings'
import { Bars } from '@/components/admin/charts'
import { Switch } from '@/components/ui/switch'

type JobState = 'assigned' | 'en-route' | 'waiting' | 'on-trip' | 'done'
interface JobLog { state: JobState; waitStart?: number; waitedSec?: number; tripStart?: number; tripEnd?: number }
const KEY = 'rentalos:driver-jobs'
const loadLogs = (): Record<string, JobLog> => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}

const pin = (color: string) => L.divIcon({ html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:3px solid #0A0A09;box-shadow:0 0 0 2px ${color}"></div>`, className: '', iconSize: [18, 18], iconAnchor: [9, 9] })

const WAIT_FREE_MIN = 30
const WAIT_FEE_PER_MIN = 200

export default function DriverApp() {
  const session = useSession()
  const s = useDb((x) => x)
  const me = s.chauffeurs.find((d) => d.id === (session.chauffeurId ?? 'd-1'))!
  const [tab, setTab] = useState<'today' | 'earnings' | 'profile'>('today')
  const [openJob, setOpenJob] = useState<string | null>(null)
  const [logs, setLogs] = useState<Record<string, JobLog>>(loadLogs)
  const [, tick] = useState(0)

  useEffect(() => {
    document.title = `Chauffeur · ${brand.name}`
    if (!session.chauffeurId) setSession({ chauffeurId: 'd-1' })
  }, [session.chauffeurId])
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [])
  const saveLog = (id: string, patch: Partial<JobLog>) => {
    setLogs((prev) => {
      const next = { ...prev, [id]: { ...(prev[id] ?? { state: 'assigned' }), ...patch } }
      try {
        localStorage.setItem(KEY, JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }

  const jobs = useMemo(
    () => s.bookings.filter((b) => b.chauffeurId === me.id && ['confirmed', 'active', 'pending'].includes(b.status)).sort((a, b) => +new Date(a.start) - +new Date(b.start)),
    [s.bookings, me.id],
  )
  const todayJobs = jobs.filter((b) => new Date(b.start) <= addDays(startOfDay(), 1) || b.status === 'active')
  const upcoming = jobs.filter((b) => !todayJobs.includes(b))
  const job = s.bookings.find((b) => b.id === openJob)

  return (
    <div className="min-h-dvh bg-[#050505] font-body text-paper md:py-6">
      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col bg-ink md:min-h-[860px] md:overflow-hidden md:rounded-[28px] md:border md:border-line-strong md:shadow-[0_40px_100px_-30px_rgba(0,0,0,.9)]">
        <AnimatePresence mode="wait" initial={false}>
          {job ? (
            <motion.div key="job" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} transition={{ duration: 0.25 }} className="flex flex-1 flex-col">
              <JobDetail b={job} log={logs[job.id] ?? { state: job.status === 'active' ? 'on-trip' : 'assigned' }} save={(p) => saveLog(job.id, p)} onBack={() => setOpenJob(null)} />
            </motion.div>
          ) : (
            <motion.div key="main" initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }} transition={{ duration: 0.25 }} className="flex flex-1 flex-col">
              <header className="flex items-center gap-3 px-5 pt-6 pb-4">
                <span className="grid size-11 place-items-center rounded-full bg-accent font-bold text-accent-ink">{me.name.split(' ').map((p) => p[0]).join('')}</span>
                <div className="flex-1">
                  <p className="text-[13px] text-mute">Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'},</p>
                  <p className="text-[18px] font-bold">{me.name.split(' ')[0]}</p>
                </div>
                <label className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-[12.5px]">
                  <span className={me.available ? 'text-ok' : 'text-mute'}>{me.available ? 'Online' : 'Offline'}</span>
                  <Switch checked={me.available} onCheckedChange={(v) => { db.set((d) => { d.chauffeurs.find((x) => x.id === me.id)!.available = v }); toast.success(v ? 'You’re online — new jobs can be assigned' : 'You’re offline') }} aria-label="Available for jobs" />
                </label>
              </header>
              <div className="flex-1 overflow-y-auto px-5 pb-28" data-lenis-prevent>
                {tab === 'today' && (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-xl bg-ink-2 p-3"><p className="text-[11.5px] text-mute">Jobs today</p><p className="num text-xl">{todayJobs.length}</p></div>
                      <div className="rounded-xl bg-ink-2 p-3"><p className="text-[11.5px] text-mute">Rating</p><p className="num flex items-center gap-1 text-xl">{me.rating.toFixed(1)}<Star className="size-3.5 fill-accent text-accent" /></p></div>
                      <div className="rounded-xl bg-ink-2 p-3"><p className="text-[11.5px] text-mute">This month</p><p className="num text-[15px] leading-7">{naira(me.earningsMonth)}</p></div>
                    </div>
                    <h2 className="mt-6 text-[13px] font-semibold text-mute">Today</h2>
                    <JobList jobs={todayJobs} logs={logs} onOpen={setOpenJob} empty="No jobs today. Stay online to receive new ones." />
                    {upcoming.length > 0 && (
                      <>
                        <h2 className="mt-6 text-[13px] font-semibold text-mute">Upcoming</h2>
                        <JobList jobs={upcoming.slice(0, 6)} logs={logs} onOpen={setOpenJob} />
                      </>
                    )}
                  </>
                )}
                {tab === 'earnings' && <Earnings driverId={me.id} />}
                {tab === 'profile' && (
                  <div className="flex flex-col gap-3 text-[14px]">
                    <div className="rounded-xl bg-ink-2 p-4">
                      <p className="text-lg font-bold">{me.name}</p>
                      <p className="text-mute">{me.city} · {me.years} years driving · {me.languages.join(', ')}</p>
                    </div>
                    {[
                      ['Phone', me.phone], ['Licence expires', fmtDay(me.licenceExpiry)], ['Total trips', String(me.trips)], ['Background check', 'Passed'],
                    ].map(([k, v]) => <div key={k} className="flex justify-between rounded-xl bg-ink-2 px-4 py-3"><span className="text-mute">{k}</span><span className="font-semibold">{v}</span></div>)}
                    <a href={`tel:${brand.contact.phoneTel}`} className="mt-2 flex items-center justify-center gap-2 rounded-xl border border-line py-3 font-semibold"><Phone className="size-4" />Call dispatch</a>
                  </div>
                )}
              </div>
              <nav className="absolute inset-x-0 bottom-0 grid grid-cols-3 border-t border-line bg-ink-2/95 pb-[env(safe-area-inset-bottom)] backdrop-blur" aria-label="Driver app">
                {([['today', 'Jobs', Home], ['earnings', 'Earnings', Wallet], ['profile', 'Profile', User]] as const).map(([id, label, Icon]) => (
                  <button key={id} type="button" onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined} className={cn('flex flex-col items-center gap-1 py-3 text-[11.5px] font-semibold', tab === id ? 'text-accent' : 'text-mute')}>
                    <Icon className="size-5" />{label}
                  </button>
                ))}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function JobList({ jobs, logs, onOpen, empty }: { jobs: Booking[]; logs: Record<string, JobLog>; onOpen: (id: string) => void; empty?: string }) {
  const s = useDb((x) => x)
  if (!jobs.length) return <p className="mt-3 rounded-xl bg-ink-2 p-4 text-[14px] text-mute">{empty}</p>
  return (
    <ul className="mt-3 flex flex-col gap-3">
      {jobs.map((b) => {
        const car = s.cars.find((c) => c.id === b.carId)!
        const cust = s.customers.find((c) => c.id === b.customerId)
        const st = logs[b.id]?.state ?? (b.status === 'active' ? 'on-trip' : 'assigned')
        const airport = locationById(b.pickup)?.kind === 'airport'
        return (
          <li key={b.id}>
            <button type="button" onClick={() => onOpen(b.id)} className="w-full rounded-2xl bg-ink-2 p-4 text-left active:scale-[.99]">
              <div className="flex items-center justify-between">
                <span className="num text-[22px] font-medium">{fmtTime(b.start)}</span>
                <span className={cn('rounded-full px-2.5 py-1 text-[11.5px] font-semibold', st === 'on-trip' ? 'bg-ok/15 text-ok' : st === 'waiting' ? 'bg-warn/15 text-warn' : st === 'en-route' ? 'bg-accent/15 text-accent' : st === 'done' ? 'bg-paper/10 text-mute' : 'bg-paper/10 text-paper')}>
                  {{ assigned: relDay(b.start), 'en-route': 'En route', waiting: 'Waiting', 'on-trip': 'On trip', done: 'Done' }[st]}
                </span>
              </div>
              <p className="mt-2 flex items-start gap-2 text-[14px]">{airport ? <Plane className="mt-0.5 size-4 shrink-0 text-accent" /> : <MapPin className="mt-0.5 size-4 shrink-0 text-accent" />}{locationName(b.pickup)}</p>
              <p className="mt-1 text-[13px] text-mute">{cust?.name} · {carName(car)}</p>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function JobDetail({ b, log, save, onBack }: { b: Booking; log: JobLog; save: (p: Partial<JobLog>) => void; onBack: () => void }) {
  const s = useDb((x) => x)
  const car = s.cars.find((c) => c.id === b.carId)!
  const cust = s.customers.find((c) => c.id === b.customerId)
  const pick = locationById(b.pickup)!
  const drop = locationById(b.dropoff)!
  const base = locations.find((l) => l.city === pick.city && l.kind === 'office')!
  const now = Date.now()
  const waited = (log.waitedSec ?? 0) + (log.state === 'waiting' && log.waitStart ? Math.floor((now - log.waitStart) / 1000) : 0)
  const tripSec = log.tripStart ? Math.floor(((log.tripEnd ?? now) - log.tripStart) / 1000) : 0
  const mmss = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`
  const waitFee = Math.max(0, Math.floor(waited / 60) - WAIT_FREE_MIN) * WAIT_FEE_PER_MIN
  const route: [number, number][] = [[base.lat, base.lng], [(base.lat + pick.lat) / 2 + 0.01, (base.lng + pick.lng) / 2], [pick.lat, pick.lng]]

  const next = async () => {
    if (log.state === 'assigned') {
      save({ state: 'en-route' })
      toast.success(`Customer notified: ${s.chauffeurs.find((d) => d.id === b.chauffeurId)?.name.split(' ')[0]} is on the way`)
    } else if (log.state === 'en-route') {
      save({ state: 'waiting', waitStart: Date.now() })
      toast('Arrived — waiting timer started')
    } else if (log.state === 'waiting') {
      save({ state: 'on-trip', waitedSec: waited, waitStart: undefined, tripStart: Date.now() })
      if (b.status !== 'active') await bookingService.update(b.id, { status: 'active' })
      toast.success('Trip started')
    } else if (log.state === 'on-trip') {
      save({ state: 'done', tripEnd: Date.now() })
      await bookingService.update(b.id, { status: 'returned' })
      db.set((d) => {
        const dr = d.chauffeurs.find((x) => x.id === b.chauffeurId)
        if (dr) {
          dr.trips += 1
          dr.payoutPending += 25000 + waitFee
          dr.earningsMonth += 25000 + waitFee
        }
      })
      toast.success(`Trip complete · ${naira(25000 + waitFee)} added to your earnings`)
    }
  }
  const label = { assigned: 'Start driving to pick-up', 'en-route': 'I’ve arrived', waiting: 'Customer is in — start trip', 'on-trip': 'End trip', done: 'Trip complete' }[log.state]

  return (
    <div className="flex flex-1 flex-col">
      <div className="relative h-64 shrink-0">
        <MapContainer center={[pick.lat, pick.lng]} zoom={12} zoomControl={false} attributionControl className="h-full w-full" maxZoom={mapTiles.maxZoom}>
          <TileLayer url={mapTiles.base} attribution={mapTiles.attribution} maxZoom={mapTiles.maxZoom} />
          {mapTiles.labels && <TileLayer url={mapTiles.labels} maxZoom={mapTiles.maxZoom} />}
          <Polyline positions={route} pathOptions={{ color: brand.colors.accent, weight: 4, dashArray: log.state === 'assigned' ? '6 8' : undefined }} />
          <Marker position={[base.lat, base.lng]} icon={pin('#9C988E')} />
          <Marker position={[pick.lat, pick.lng]} icon={pin(brand.colors.accent)} />
        </MapContainer>
        <button type="button" onClick={onBack} className="absolute left-4 top-4 z-[500] grid size-10 place-items-center rounded-full bg-ink/90" aria-label="Back to jobs"><ArrowLeft className="size-5" /></button>
        <a href={`https://www.google.com/maps/dir/?api=1&destination=${pick.lat},${pick.lng}`} target="_blank" rel="noreferrer" className="absolute right-4 top-4 z-[500] flex items-center gap-1.5 rounded-full bg-accent px-3 py-2 text-[12.5px] font-semibold text-accent-ink"><Navigation className="size-3.5" />Navigate</a>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-32" data-lenis-prevent>
        <p className="num text-[13px] text-mute">{b.ref} · {fmtDay(b.start)}</p>
        <h1 className="mt-1 text-xl font-bold">{locationName(b.pickup)}</h1>
        <p className="mt-1 text-[14px] text-mute">Pick-up {fmtTime(b.start)} → drop-off {locationName(b.dropoff)}</p>
        <div className="mt-5 flex items-center gap-3 rounded-2xl bg-ink-2 p-4">
          <span className="grid size-11 place-items-center rounded-full bg-paper/10 font-bold">{cust?.name.split(' ').map((p) => p[0]).join('')}</span>
          <div className="flex-1"><p className="font-semibold">{cust?.name}</p><p className="text-[12.5px] text-mute">{cust?.verification === 'verified' ? 'Verified customer' : 'ID check pending'}{b.extras.length ? ` · ${b.extras.join(', ')}` : ''}</p></div>
          <a href={`tel:${cust?.phone.replace(/\s/g, '')}`} className="grid size-10 place-items-center rounded-full bg-ok/15 text-ok" aria-label={`Call ${cust?.name}`}><Phone className="size-4" /></a>
          <a href={`https://wa.me/${cust?.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="grid size-10 place-items-center rounded-full bg-[#25d366]/15 text-[#25d366]" aria-label={`WhatsApp ${cust?.name}`}><MessageCircle className="size-4" /></a>
        </div>
        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-ink-2 p-4">
          <Car className="size-5 text-accent" />
          <div><p className="font-semibold">{carName(car)}</p><p className="num text-[12.5px] text-mute">{car.plate} · {car.colour}</p></div>
        </div>
        {(log.state === 'waiting' || waited > 0) && (
          <div className={cn('mt-3 flex items-center justify-between rounded-2xl p-4', waited / 60 > WAIT_FREE_MIN ? 'bg-warn/12' : 'bg-ink-2')}>
            <span className="flex items-center gap-2"><Timer className="size-5 text-warn" />Waiting time</span>
            <span className="text-right"><span className="num block text-[20px]">{mmss(waited)}</span><span className="text-[11.5px] text-mute">{waitFee ? `+${naira(waitFee)} wait fee` : `${WAIT_FREE_MIN} min free`}</span></span>
          </div>
        )}
        {log.tripStart && (
          <div className="mt-3 flex items-center justify-between rounded-2xl bg-ink-2 p-4">
            <span className="flex items-center gap-2"><Clock className="size-5 text-ok" />Trip time</span>
            <span className="num text-[20px]">{mmss(tripSec)}</span>
          </div>
        )}
        <p className="mt-4 flex items-center gap-2 text-[12.5px] text-mute"><CalendarDays className="size-3.5" />Booked until {fmtDay(b.end)} {fmtTime(b.end)} · drop-off {drop.city}</p>
      </div>
      <div className="absolute inset-x-0 bottom-0 border-t border-line bg-ink-2/95 p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] backdrop-blur">
        <button type="button" disabled={log.state === 'done'} onClick={next} className={cn('flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[16px] font-bold transition-transform active:scale-[.98] disabled:opacity-60', log.state === 'on-trip' ? 'bg-bad text-ink' : 'bg-accent text-accent-ink')}>
          {log.state === 'done' ? <CheckCircle2 className="size-5" /> : null}{label}
        </button>
      </div>
    </div>
  )
}

function Earnings({ driverId }: { driverId: string }) {
  const s = useDb((x) => x)
  const me = s.chauffeurs.find((d) => d.id === driverId)!
  const days = Array.from({ length: 7 }, (_, i) => addDays(startOfDay(), i - 6))
  const data = days.map((d) => {
    const n = s.bookings.filter((b) => b.chauffeurId === driverId && b.status !== 'cancelled' && isoDate(b.start) <= isoDate(d) && isoDate(b.end) >= isoDate(d)).length
    return { day: d.toLocaleDateString('en-GB', { weekday: 'short' }), earned: n * 25000 }
  })
  const week = data.reduce((a, d) => a + d.earned, 0)
  const rated = s.bookings.filter((b) => b.chauffeurId === driverId && b.rating).slice(0, 5)
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl bg-accent p-5 text-accent-ink">
        <p className="text-[13px] font-semibold opacity-75">This week</p>
        <p className="num text-[32px] font-medium">{naira(week)}</p>
        <p className="text-[13px] opacity-75">Payout pending {naira(me.payoutPending)} · paid every Friday</p>
      </div>
      <div className="rounded-2xl bg-ink-2 p-3"><Bars data={data} x="day" y="earned" height={180} /></div>
      <h2 className="text-[13px] font-semibold text-mute">Recent ratings</h2>
      <ul className="flex flex-col gap-2">
        {rated.length ? rated.map((b) => (
          <li key={b.id} className="flex items-center justify-between rounded-xl bg-ink-2 px-4 py-3 text-[14px]">
            <span>{s.customers.find((c) => c.id === b.customerId)?.name}<span className="block text-[12px] text-mute">{fmtDay(b.end)}</span></span>
            <span className="num text-accent">{'★'.repeat(b.rating!)}</span>
          </li>
        )) : <li className="rounded-xl bg-ink-2 p-4 text-[14px] text-mute">No ratings yet this month.</li>}
      </ul>
    </div>
  )
}
