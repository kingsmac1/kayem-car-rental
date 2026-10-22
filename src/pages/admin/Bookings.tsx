import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { CalendarPlus, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { toast } from 'sonner'
import { brand } from '@/config/brand'
import { useDb, useSession } from '@/lib/db'
import { seesMoney } from '@/lib/roles'
import { addDays, cn, downloadCsv, fmtDay, fmtTime, isoDate, naira, startOfDay } from '@/lib/utils'
import { carName } from '@/mocks/cars'
import { locationName } from '@/mocks/locations'
import type { Booking, BookingStatus as BS } from '@/mocks/types'
import { bookingService, BookingConflictError, STATUS_FLOW } from '@/services/bookings'
import { paymentService } from '@/services/payments'
import { AdminTitle, BookingStatus, SearchBox, Segmented, TableWrap, Td, Th } from '@/components/admin/kit'
import { BookingForm } from '@/components/admin/BookingForm'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/misc'
import { Select } from '@/components/ui/input'

const route = getRouteApi('/admin/bookings')
const STATUSES: (BS | 'all')[] = ['all', 'pending', 'confirmed', 'active', 'returned', 'closed', 'cancelled']

export default function Bookings() {
  const search = route.useSearch()
  const navigate = useNavigate({ from: '/admin/bookings' })
  const s = useDb((x) => x)
  const money = seesMoney(useSession().staff!.role)
  const [view, setView] = useState<'table' | 'timeline'>('table')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<BS | 'all'>('all')
  const [city, setCity] = useState('all')
  const [sort, setSort] = useState<{ key: 'start' | 'total' | 'ref'; dir: 'asc' | 'desc' }>({ key: 'start', dir: 'desc' })
  const [creating, setCreating] = useState(search.new === '1')
  const openId = search.id

  const rows = useMemo(() => {
    const needle = q.toLowerCase()
    return s.bookings
      .filter((b) => status === 'all' || b.status === status)
      .filter((b) => city === 'all' || s.cars.find((c) => c.id === b.carId)?.city === city)
      .filter((b) => {
        if (!needle) return true
        const c = s.customers.find((x) => x.id === b.customerId)
        const car = s.cars.find((x) => x.id === b.carId)
        return [b.ref, c?.name, c?.phone, car && carName(car), car?.plate].some((v) => v?.toLowerCase().includes(needle))
      })
      .sort((a, b) => {
        const v = sort.key === 'start' ? +new Date(a.start) - +new Date(b.start) : sort.key === 'total' ? a.total - b.total : a.ref.localeCompare(b.ref)
        return sort.dir === 'asc' ? v : -v
      })
  }, [s, q, status, city, sort])

  const toggleSort = (key: typeof sort.key) => setSort((p) => ({ key, dir: p.key === key && p.dir === 'desc' ? 'asc' : 'desc' }))
  const open = (id?: string) => navigate({ search: (p) => ({ ...p, id }), replace: true })
  const selected = s.bookings.find((b) => b.id === openId)
  const now = new Date()

  return (
    <div>
      <AdminTitle title="Bookings" sub={`${s.bookings.filter((b) => ['pending', 'confirmed', 'active'].includes(b.status)).length} live · ${s.bookings.length} total`}>
        <Segmented label="View" value={view} onChange={setView} options={[{ id: 'table', label: 'Table' }, { id: 'timeline', label: 'Timeline' }]} />
        <Button size="app" variant="subtle" icon={<Download className="size-4" />} onClick={() => downloadCsv('bookings.csv', rows.map((b) => ({ ref: b.ref, status: b.status, customer: s.customers.find((c) => c.id === b.customerId)?.name, car: carName(s.cars.find((c) => c.id === b.carId)!), start: b.start, end: b.end, total: money ? b.total : '', paid: money ? b.paid : '', channel: b.channel })))}>
          CSV
        </Button>
        <Button size="app" icon={<CalendarPlus className="size-4" />} onClick={() => setCreating(true)}>New booking</Button>
      </AdminTitle>

      {view === 'table' ? (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <SearchBox value={q} onChange={setQ} placeholder="Search ref, customer, car, plate" />
            <Select compact value={status} onChange={(e) => setStatus(e.target.value as BS | 'all')} aria-label="Filter by status" className="w-36 capitalize">
              {STATUSES.map((x) => <option key={x} value={x}>{x === 'all' ? 'All statuses' : x}</option>)}
            </Select>
            <Select compact value={city} onChange={(e) => setCity(e.target.value)} aria-label="Filter by city" className="w-40">
              <option value="all">All cities</option>
              {brand.cities.map((c) => <option key={c}>{c}</option>)}
            </Select>
            <span className="text-[12.5px] text-mute">{rows.length} shown</span>
          </div>
          {rows.length ? (
            <TableWrap>
              <thead>
                <tr>
                  <Th sort={sort.key === 'ref'} dir={sort.dir} onSort={() => toggleSort('ref')}>Ref</Th>
                  <Th>Customer</Th>
                  <Th>Car</Th>
                  <Th sort={sort.key === 'start'} dir={sort.dir} onSort={() => toggleSort('start')}>Dates</Th>
                  <Th>Channel</Th>
                  <Th>Status</Th>
                  {money && <Th sort={sort.key === 'total'} dir={sort.dir} onSort={() => toggleSort('total')} className="text-right">Total</Th>}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 150).map((b) => {
                  const c = s.customers.find((x) => x.id === b.customerId)
                  const car = s.cars.find((x) => x.id === b.carId)!
                  const overdue = b.status === 'active' && new Date(b.end) < now
                  return (
                    <tr key={b.id} onClick={() => open(b.id)} className="cursor-pointer hover:bg-paper/[0.03]" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && open(b.id)}>
                      <Td className="num">{b.ref}</Td>
                      <Td>{c?.name}<span className="block text-[12px] text-mute">{c?.phone}</span></Td>
                      <Td>{carName(car)}<span className="block text-[12px] text-mute">{car.city} · {car.plate}</span></Td>
                      <Td className="whitespace-nowrap">{fmtDay(b.start)} → {fmtDay(b.end)}<span className="block text-[12px] text-mute">{b.mode === 'chauffeur' ? 'Chauffeur' : 'Self-drive'}</span></Td>
                      <Td className="capitalize text-mute">{b.channel}</Td>
                      <Td><BookingStatus status={b.status} overdue={overdue} /></Td>
                      {money && <Td className="num text-right">{naira(b.total)}{b.paid < b.total && b.status !== 'cancelled' ? <span className="block text-[11.5px] text-warn">{naira(b.total - b.paid)} due</span> : null}</Td>}
                    </tr>
                  )
                })}
              </tbody>
            </TableWrap>
          ) : (
            <EmptyState title="No bookings match" body="Clear the search or filters to see more." />
          )}
        </>
      ) : (
        <Timeline onOpen={open} />
      )}

      <Dialog open={creating} onOpenChange={(o) => { setCreating(o); if (!o && search.new) navigate({ search: (p) => ({ ...p, new: undefined }), replace: true }) }}>
        {creating && (
          <DialogContent title="New booking" description="The car list flags anything already booked or blocked for your dates." className="max-w-2xl">
            <BookingForm onDone={(b) => { setCreating(false); open(b.id) }} />
          </DialogContent>
        )}
      </Dialog>
      <Dialog open={!!selected} onOpenChange={(o) => !o && open(undefined)}>
        {selected && <BookingDrawer b={selected} money={money} />}
      </Dialog>
    </div>
  )
}

function BookingDrawer({ b, money }: { b: Booking; money: boolean }) {
  const s = useDb((x) => x)
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [busy, setBusy] = useState<string | null>(null)
  const [extendDays, setExtendDays] = useState(1)
  const car = s.cars.find((c) => c.id === b.carId)!
  const c = s.customers.find((x) => x.id === b.customerId)
  const driver = s.chauffeurs.find((d) => d.id === b.chauffeurId)
  const idx = STATUS_FLOW.indexOf(b.status)
  const next = idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null
  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key)
    try {
      await fn()
      toast.success(ok)
    } catch (e) {
      toast.error(e instanceof BookingConflictError || e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setBusy(null)
    }
  }

  return (
    <DialogContent side="right" title={`${b.ref} · ${carName(car)}`} description={`${c?.name ?? 'Unknown'} · ${b.channel}`}>
      {mode === 'edit' ? (
        <>
          <BookingForm existing={b} onDone={() => setMode('view')} />
          <Button size="app" variant="subtle" className="mt-3" onClick={() => setMode('view')}>Back</Button>
        </>
      ) : (
        <div className="flex flex-col gap-6 text-[13.5px]">
          {/* Status flow */}
          <div>
            <p className="mb-2 text-xs font-semibold text-mute">Status</p>
            {b.status === 'cancelled' ? (
              <BookingStatus status="cancelled" />
            ) : (
              <ol className="grid grid-cols-5 gap-1">
                {STATUS_FLOW.map((st, i) => (
                  <li key={st} className="text-center">
                    <div className={cn('h-1.5 rounded-full', i <= idx ? 'bg-accent' : 'bg-paper/10')} />
                    <p className={cn('mt-1.5 text-[11.5px] capitalize', i === idx ? 'font-semibold text-paper' : 'text-mute')}>{st}</p>
                  </li>
                ))}
              </ol>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {next && <Button size="app" loading={busy === 'adv'} onClick={() => run('adv', () => bookingService.advance(b.id), `${b.ref} moved to ${next}`)}>Mark as {next}</Button>}
              {['pending', 'confirmed', 'active'].includes(b.status) && <Button size="app" variant="subtle" onClick={() => setMode('edit')}>Edit</Button>}
              {['pending', 'confirmed'].includes(b.status) && <Button size="app" variant="subtle" className="text-bad" loading={busy === 'cancel'} onClick={() => run('cancel', () => bookingService.cancel(b.id), `${b.ref} cancelled — deposit refunded`)}>Cancel</Button>}
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-4">
            <div><dt className="text-mute">Pick-up</dt><dd className="font-semibold">{fmtDay(b.start)}, {fmtTime(b.start)}</dd><dd className="text-mute">{locationName(b.pickup)}</dd></div>
            <div><dt className="text-mute">Return</dt><dd className="font-semibold">{fmtDay(b.end)}, {fmtTime(b.end)}</dd><dd className="text-mute">{locationName(b.dropoff)}</dd></div>
            <div><dt className="text-mute">Customer</dt><dd className="font-semibold">{c?.name}</dd><dd className="text-mute">{c?.phone} · ID {c?.verification}</dd></div>
            <div><dt className="text-mute">Drive</dt><dd className="font-semibold">{b.mode === 'chauffeur' ? `Chauffeur${driver ? ` — ${driver.name}` : ' (unassigned)'}` : 'Self-drive'}</dd><dd className="text-mute">{b.extras.join(', ') || 'No extras'}</dd></div>
          </dl>
          {money && (
            <div className="border border-line">
              <div className="flex justify-between border-b border-line px-3 py-2"><span>Rental</span><span className="num">{naira(b.total)}</span></div>
              <div className="flex justify-between border-b border-line px-3 py-2"><span>Paid</span><span className="num">{naira(b.paid)}</span></div>
              <div className="flex justify-between border-b border-line px-3 py-2"><span>Deposit ({b.depositStatus})</span><span className="num">{naira(b.deposit)}</span></div>
              {b.deductions.map((d) => <div key={d.label} className="flex justify-between border-b border-line px-3 py-2 text-bad"><span>{d.label}</span><span className="num">−{naira(d.amount)}</span></div>)}
              <div className="flex flex-wrap gap-2 p-3">
                {b.paid < b.total && b.status !== 'cancelled' && <Button size="appSm" variant="subtle" onClick={() => run('pay', () => bookingService.update(b.id, { paid: b.total }), 'Payment recorded')}>Record payment of {naira(b.total - b.paid)}</Button>}
                {b.depositStatus === 'held' && ['returned', 'closed'].includes(b.status) && <Button size="appSm" variant="subtle" loading={busy === 'ref'} onClick={() => run('ref', () => paymentService.refundDeposit(b.id), 'Deposit refunded')}>Refund deposit</Button>}
              </div>
            </div>
          )}
          {['confirmed', 'active'].includes(b.status) && (
            <div>
              <p className="mb-2 text-xs font-semibold text-mute">Extend</p>
              <div className="flex gap-2">
                <Select compact value={extendDays} onChange={(e) => setExtendDays(Number(e.target.value))} aria-label="Extra days" className="w-32">
                  {[1, 2, 3, 4, 5, 7, 14].map((n) => <option key={n} value={n}>{n} day{n > 1 ? 's' : ''}</option>)}
                </Select>
                <Button size="app" variant="subtle" loading={busy === 'ext'} onClick={() => run('ext', () => bookingService.extend(b.id, extendDays, car.rates.daily), `Extended by ${extendDays} day${extendDays > 1 ? 's' : ''}`)}>
                  Extend{money ? ` (+${naira(car.rates.daily * extendDays)})` : ''}
                </Button>
              </div>
              <p className="mt-1.5 text-[12px] text-mute">Blocked automatically if the car is booked right after.</p>
            </div>
          )}
        </div>
      )}
    </DialogContent>
  )
}

/** Cars as rows, days as columns, bookings as bars. */
function Timeline({ onOpen }: { onOpen: (id: string) => void }) {
  const s = useDb((x) => x)
  const [offset, setOffset] = useState(-3)
  const [city, setCity] = useState('all')
  const DAYS = 21
  const from = addDays(startOfDay(), offset)
  const to = addDays(from, DAYS)
  const days = Array.from({ length: DAYS }, (_, i) => addDays(from, i))
  const cars = s.cars.filter((c) => city === 'all' || c.city === city)
  const col = 44
  const pos = (d: string) => ((+new Date(d) - +from) / 86_400_000) * col
  const nowX = ((Date.now() - +from) / 86_400_000) * col
  const tone: Record<BS, string> = { pending: 'bg-warn/80 text-ink', confirmed: 'bg-accent text-accent-ink', active: 'bg-ok text-ink', returned: 'bg-paper/50 text-ink', closed: 'bg-paper/20 text-paper', cancelled: 'bg-bad/40 text-paper line-through' }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button size="appSm" variant="subtle" onClick={() => setOffset((o) => o - 7)} aria-label="Previous week"><ChevronLeft className="size-4" /></Button>
        <Button size="appSm" variant="subtle" onClick={() => setOffset(-3)}>Today</Button>
        <Button size="appSm" variant="subtle" onClick={() => setOffset((o) => o + 7)} aria-label="Next week"><ChevronRight className="size-4" /></Button>
        <span className="text-[13px] text-mute">{fmtDay(from)} – {fmtDay(addDays(to, -1))}</span>
        <Select compact value={city} onChange={(e) => setCity(e.target.value)} aria-label="City" className="ml-auto w-40">
          <option value="all">All cities</option>
          {brand.cities.map((c) => <option key={c}>{c}</option>)}
        </Select>
      </div>
      <div className="flex flex-wrap gap-3 pb-3 text-[12px] text-mute">
        {(['pending', 'confirmed', 'active', 'returned', 'closed'] as BS[]).map((k) => <span key={k} className="flex items-center gap-1.5 capitalize"><span className={cn('size-2.5 rounded-sm', tone[k].split(' ')[0])} />{k}</span>)}
      </div>
      <div className="overflow-x-auto border border-line bg-ink-2" data-lenis-prevent>
        <div style={{ width: 200 + DAYS * col }}>
          <div className="sticky top-0 z-10 flex border-b border-line bg-ink-2">
            <div className="sticky left-0 z-20 w-[200px] shrink-0 border-r border-line bg-ink-2 px-3 py-2 text-xs font-semibold text-mute">Car</div>
            {days.map((d) => (
              <div key={d.toISOString()} style={{ width: col }} className={cn('shrink-0 border-r border-line py-1.5 text-center text-[11px]', isoDate(d) === isoDate(new Date()) ? 'bg-accent/10 text-accent' : [0, 6].includes(d.getDay()) ? 'text-paper/70' : 'text-mute')}>
                <div>{d.toLocaleDateString('en-GB', { weekday: 'narrow' })}</div>
                <div className="num font-semibold">{d.getDate()}</div>
              </div>
            ))}
          </div>
          {cars.map((car) => {
            const bars = s.bookings.filter((b) => b.carId === car.id && new Date(b.end) > from && new Date(b.start) < to && b.status !== 'cancelled')
            return (
              <div key={car.id} className="flex border-b border-line">
                <div className="sticky left-0 z-10 w-[200px] shrink-0 border-r border-line bg-ink-2 px-3 py-2">
                  <p className="truncate text-[12.5px] font-semibold">{carName(car)}</p>
                  <p className="text-[11px] text-mute">{car.city} · {car.plate}</p>
                </div>
                <div className="relative h-12 shrink-0" style={{ width: DAYS * col, backgroundImage: `repeating-linear-gradient(90deg, transparent 0 ${col - 1}px, rgba(242,239,232,.06) ${col - 1}px ${col}px)` }}>
                  {nowX > 0 && nowX < DAYS * col && <div className="absolute inset-y-0 w-px bg-bad" style={{ left: nowX }} aria-hidden />}
                  {bars.map((b) => {
                    const left = Math.max(0, pos(b.start))
                    const right = Math.min(DAYS * col, pos(b.end))
                    const cust = s.customers.find((c) => c.id === b.customerId)
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => onOpen(b.id)}
                        title={`${b.ref} · ${cust?.name} · ${fmtDay(b.start)} → ${fmtDay(b.end)}`}
                        className={cn('absolute top-2 h-8 overflow-hidden rounded-[3px] px-2 text-left text-[11.5px] font-semibold leading-8 whitespace-nowrap hover:brightness-110', tone[b.status])}
                        style={{ left: left + 1, width: Math.max(10, right - left - 2) }}
                      >
                        {cust?.name.split(' ')[0]} · {b.ref.slice(4)}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
