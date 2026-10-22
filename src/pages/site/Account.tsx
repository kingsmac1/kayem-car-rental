import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Camera, Car as CarIcon, CheckCircle2, Clock, Copy, Gift, LogOut, MapPin, Receipt, RotateCcw, ShieldCheck, Timer, Wrench, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { brand } from '@/config/brand'
import { clearSession, db, setSession, useDb, useSession } from '@/lib/db'
import { addDays, cn, fmtDateY, fmtDay, fmtTime, isoDate, naira, relDay } from '@/lib/utils'
import { carName } from '@/mocks/cars'
import { locationName } from '@/mocks/locations'
import type { Booking, Car } from '@/mocks/types'
import { bookingService, BookingConflictError } from '@/services/bookings'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState, Pill } from '@/components/ui/misc'
import { Field, Select, Textarea } from '@/components/ui/input'
import { GridLines } from '@/components/site/Reveal'
import { Checkout } from '@/components/booking/Checkout'
import { sm } from '@/data/images'

const STATUS_TONE: Record<Booking['status'], 'ok' | 'warn' | 'bad' | 'accent' | 'mute' | 'info'> = {
  pending: 'warn', confirmed: 'accent', active: 'ok', returned: 'info', closed: 'mute', cancelled: 'bad',
}

function useTitle() {
  useEffect(() => {
    document.title = `My trips | ${brand.name}`
  }, [])
}

export default function Account() {
  useTitle()
  const session = useSession()
  const navigate = useNavigate()
  const customer = useDb((s) => s.customers.find((c) => c.id === session.customerId))
  const bookings = useDb((s) => s.bookings.filter((b) => b.customerId === session.customerId))
  const cars = useDb((s) => s.cars)
  const referrals = useDb((s) => s.referrals.filter((r) => r.referrerId === session.customerId))

  const groups = useMemo(() => {
    const sorted = [...bookings].sort((a, b) => +new Date(b.start) - +new Date(a.start))
    return {
      upcoming: sorted.filter((b) => ['pending', 'confirmed', 'active'].includes(b.status)).reverse(),
      past: sorted.filter((b) => ['returned', 'closed', 'cancelled'].includes(b.status)),
    }
  }, [bookings])

  if (!customer) {
    return (
      <section className="relative min-h-dvh pt-36 pb-24">
        <GridLines />
        <div className="container-x relative">
          <h1 className="display text-[clamp(40px,6vw,88px)] font-extrabold uppercase tracking-[-0.045em]">My trips</h1>
          <EmptyState
            className="mt-12 bg-ink"
            icon={<CarIcon className="size-8" />}
            title="Log in to see your trips"
            body="Your bookings, receipts, deposits and rewards live here."
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <Button asChild roll>
                  <Link to="/login">Log in or sign up</Link>
                </Button>
                <Button variant="ghost" onClick={() => setSession({ customerId: 'c-1' })}>
                  Use demo account
                </Button>
              </div>
            }
          />
        </div>
      </section>
    )
  }

  const deductions = bookings.filter((b) => b.deductions.length)
  const carOf = (id: string) => cars.find((c) => c.id === id)!

  return (
    <section className="relative min-h-dvh pt-32 pb-24">
      <GridLines />
      <div className="container-x relative">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="label text-mute">My account</p>
            <h1 className="display mt-2 text-[clamp(36px,5.4vw,76px)] font-extrabold uppercase tracking-[-0.045em]">Hi, {customer.name.split(' ')[0]}</h1>
          </div>
          <div className="flex items-center gap-3">
            <VerificationBadge status={customer.verification} />
            <Button variant="ghost" size="sm" icon={<LogOut className="size-3.5" />} onClick={() => { clearSession('customerId'); navigate({ to: '/' }) }}>
              Log out
            </Button>
          </div>
        </div>

        <Tabs defaultValue="trips" className="mt-10">
          <TabsList>
            <TabsTrigger value="trips">Trips</TabsTrigger>
            <TabsTrigger value="deposits">Inspections & deposits</TabsTrigger>
            <TabsTrigger value="rewards">Rewards</TabsTrigger>
            <TabsTrigger value="details">My details</TabsTrigger>
          </TabsList>

          <TabsContent value="trips" className="pt-8">
            <h2 className="label text-mute">Upcoming and current</h2>
            {groups.upcoming.length ? (
              <ul className="mt-4 flex flex-col gap-4">
                {groups.upcoming.map((b) => <TripRow key={b.id} b={b} car={carOf(b.carId)} live />)}
              </ul>
            ) : (
              <EmptyState className="mt-4" title="No upcoming trips" body="Your next car is a few taps away." action={<Button asChild size="sm" roll><Link to="/fleet">Browse cars</Link></Button>} />
            )}
            <h2 className="label mt-12 text-mute">Past trips</h2>
            {groups.past.length ? (
              <ul className="mt-4 flex flex-col gap-4">
                {groups.past.map((b) => <TripRow key={b.id} b={b} car={carOf(b.carId)} />)}
              </ul>
            ) : (
              <p className="mt-4 text-[15px] text-mute">No past trips yet.</p>
            )}
          </TabsContent>

          <TabsContent value="deposits" className="pt-8">
            <p className="max-w-2xl text-[15px] text-paper/75">Every deduction from your deposit comes with photo evidence from the check-out and check-in walkarounds.</p>
            {deductions.length ? (
              <ul className="mt-6 flex flex-col gap-4">
                {deductions.map((b) => (
                  <li key={b.id} className="border border-line bg-ink-2 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-semibold">{carName(carOf(b.carId))} · <span className="num">{b.ref}</span></p>
                      <p className="text-[14px] text-mute">Returned {fmtDateY(b.end)}</p>
                    </div>
                    <ul className="mt-4 flex flex-col gap-3">
                      {b.deductions.map((d) => (
                        <li key={d.label} className="grid gap-4 border-t border-line pt-4 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                          {d.photo ? (
                            <div className="grid grid-cols-2 gap-2">
                              <figure><img src={sm(carOf(b.carId).image)} alt="Before: at check-out" className="aspect-[4/3] w-28 object-cover" /><figcaption className="label mt-1 !text-[9px] text-mute">Before</figcaption></figure>
                              <figure><img src={sm(d.photo)} alt="After: at check-in, damage visible" className="aspect-[4/3] w-28 object-cover" /><figcaption className="label mt-1 !text-[9px] text-bad">After</figcaption></figure>
                            </div>
                          ) : (
                            <span className="grid size-12 place-items-center bg-ink-3"><Camera className="size-5 text-mute" /></span>
                          )}
                          <div>
                            <p className="font-semibold">{d.label}</p>
                            <p className="text-[13.5px] capitalize text-mute">{d.kind} charge</p>
                          </div>
                          <p className="num text-bad">−{naira(d.amount)}</p>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-4 flex justify-between border-t border-line pt-3 text-[14px]">
                      <span className="text-mute">Deposit {naira(b.deposit)} · refunded</span>
                      <span className="num">{naira(b.deposit - b.deductions.reduce((s, d) => s + d.amount, 0))}</span>
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState className="mt-6" icon={<ShieldCheck className="size-8 text-ok" />} title="No deductions — ever" body="All your deposits have been refunded in full. Nice driving." />
            )}
            <h3 className="label mt-10 text-mute">Deposits</h3>
            <ul className="mt-3 border-t border-line">
              {bookings.slice(0, 8).map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-4 border-b border-line py-3 text-[14.5px]">
                  <span><span className="num">{b.ref}</span> <span className="text-mute">· {carName(carOf(b.carId))}</span></span>
                  <span className="flex items-center gap-3"><span className="num">{naira(b.deposit)}</span><Pill tone={b.depositStatus === 'refunded' ? 'ok' : b.depositStatus === 'deducted' ? 'warn' : b.depositStatus === 'held' ? 'accent' : 'mute'}>{b.depositStatus}</Pill></span>
                </li>
              ))}
            </ul>
          </TabsContent>

          <TabsContent value="rewards" className="pt-8">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="border border-line bg-ink-2 p-6">
                <Gift className="size-6 text-accent" />
                <p className="label mt-4 text-mute">Points</p>
                <p className="num mt-1 text-[40px] text-accent">{customer.points.toLocaleString()}</p>
                <p className="mt-2 text-[14px] text-mute">1 point per ₦100 spent. 5,000 points = one free day on any saloon.</p>
              </div>
              <div className="border border-line bg-ink-2 p-6">
                <p className="label text-mute">Your referral code</p>
                <div className="mt-3 flex items-center gap-3">
                  <p className="num text-[28px]">{customer.referralCode}</p>
                  <Button size="icon" variant="ghost" aria-label="Copy referral code" onClick={() => { navigator.clipboard?.writeText(customer.referralCode); toast.success('Code copied') }}>
                    <Copy className="size-4" />
                  </Button>
                </div>
                <p className="mt-2 text-[14px] text-mute">Friends get 10% off their first trip. You get {naira(10000)} credit when they ride.</p>
                <ul className="mt-5 border-t border-line">
                  {referrals.length ? referrals.map((r) => (
                    <li key={r.id} className="flex justify-between border-b border-line py-2.5 text-[14px]"><span>{r.friend}</span><Pill tone={r.status === 'rewarded' ? 'ok' : r.status === 'booked' ? 'accent' : 'mute'}>{r.status}</Pill></li>
                  )) : <li className="py-3 text-[14px] text-mute">No referrals yet — share your code on WhatsApp.</li>}
                </ul>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="details" className="pt-8">
            <dl className="grid max-w-2xl gap-px bg-line sm:grid-cols-2">
              {[
                ['Name', customer.name], ['Phone', customer.phone], ['Email', customer.email], ['City', customer.city], ['Member since', fmtDateY(customer.joined)], ['Verification', customer.verification === 'verified' ? 'NIN, licence and selfie verified' : customer.verification],
              ].map(([k, v]) => (
                <div key={k} className="bg-ink p-4">
                  <dt className="label text-mute">{k}</dt>
                  <dd className="mt-1 font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 text-[14px] text-mute">To change your name or ID details, message us on WhatsApp — they must match your verified ID.</p>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  )
}

function VerificationBadge({ status }: { status: string }) {
  if (status === 'verified') return <Pill tone="ok"><CheckCircle2 className="size-3.5" /> Verified</Pill>
  if (status === 'review') return <Pill tone="warn"><Clock className="size-3.5" /> Under review</Pill>
  if (status === 'failed') return <Pill tone="bad"><XCircle className="size-3.5" /> Verification failed</Pill>
  return <Pill tone="mute">Not verified yet</Pill>
}

function TripRow({ b, car, live }: { b: Booking; car: Car; live?: boolean }) {
  const navigate = useNavigate()
  const [dialog, setDialog] = useState<null | 'extend' | 'problem' | 'receipt'>(null)
  const active = b.status === 'active'
  return (
    <li className={cn('grid gap-5 border bg-ink-2 p-4 md:grid-cols-[160px_1fr_auto] md:items-center', active ? 'border-ok/40' : 'border-line')}>
      <img src={sm(car.image)} alt="" className="aspect-[4/3] w-full object-cover md:w-40" loading="lazy" />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-display text-[17px] font-bold">{carName(car)}</p>
          <Pill tone={STATUS_TONE[b.status]} dot={active}>{active ? 'On trip' : b.status}</Pill>
        </div>
        <p className="mt-2 text-[14px] text-paper/80">
          {fmtDay(b.start)} {fmtTime(b.start)} → {fmtDay(b.end)} {fmtTime(b.end)}
          {live ? <span className="text-mute"> · {active ? `returns ${relDay(b.end)}` : `starts ${relDay(b.start)}`}</span> : null}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-[13.5px] text-mute"><MapPin className="size-3.5" />{locationName(b.pickup)}</p>
        <p className="num mt-1 text-[13px] text-mute">{b.ref} · {naira(b.total)}</p>
      </div>
      <div className="flex flex-wrap gap-2 md:flex-col md:items-stretch">
        {live && b.status !== 'pending' && (
          <Button size="sm" onClick={() => setDialog('extend')} icon={<Timer className="size-3.5" />}>Extend</Button>
        )}
        {active && (
          <Button size="sm" variant="danger" onClick={() => setDialog('problem')} icon={<AlertTriangle className="size-3.5" />}>Report a problem</Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => setDialog('receipt')} icon={<Receipt className="size-3.5" />}>Receipt</Button>
        {!live && (
          <Button size="sm" variant="ghost" icon={<RotateCcw className="size-3.5" />} onClick={() => navigate({ to: '/book', search: { car: car.id, start: isoDate(addDays(new Date(), 1)), end: isoDate(addDays(new Date(), 1 + Math.max(1, Math.round((+new Date(b.end) - +new Date(b.start)) / 86_400_000)))) } })}>
            Rebook
          </Button>
        )}
      </div>
      <Dialog open={dialog === 'extend'} onOpenChange={(o) => !o && setDialog(null)}>
        {dialog === 'extend' && <ExtendDialog b={b} car={car} onDone={() => setDialog(null)} />}
      </Dialog>
      <Dialog open={dialog === 'problem'} onOpenChange={(o) => !o && setDialog(null)}>
        {dialog === 'problem' && <ProblemDialog b={b} car={car} onDone={() => setDialog(null)} />}
      </Dialog>
      <Dialog open={dialog === 'receipt'} onOpenChange={(o) => !o && setDialog(null)}>
        {dialog === 'receipt' && <ReceiptDialog b={b} car={car} />}
      </Dialog>
    </li>
  )
}

function ExtendDialog({ b, car, onDone }: { b: Booking; car: Car; onDone: () => void }) {
  const [days, setDays] = useState(2)
  const [pay, setPay] = useState(false)
  const amount = car.rates.daily * days
  const newEnd = addDays(b.end, days)
  const clash = useDb((s) => s.bookings.some((x) => x.id !== b.id && x.carId === b.carId && ['pending', 'confirmed', 'active'].includes(x.status) && new Date(x.start) < newEnd && new Date(x.end) > new Date(b.end)))
  return (
    <DialogContent title="Extend rental" description={`${carName(car)} · currently until ${fmtDay(b.end)} ${fmtTime(b.end)}`} className={pay ? 'max-w-xl' : undefined}>
      {!pay ? (
        <div className="flex flex-col gap-5">
          <Field label="Extra days" htmlFor="ext">
            <Select id="ext" value={days} onChange={(e) => setDays(Number(e.target.value))}>
              {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n} day{n > 1 ? 's' : ''}</option>)}
            </Select>
          </Field>
          <div className="flex items-baseline justify-between border-t border-line pt-4">
            <span className="text-mute">New return: {fmtDay(newEnd)} {fmtTime(newEnd)}</span>
            <span className="num text-[22px] text-accent">{naira(amount)}</span>
          </div>
          {clash ? <p className="text-[14px] text-bad">This car is booked by someone else in that window. Try fewer days, or message us to swap cars.</p> : null}
          <Button size="lg" disabled={clash} onClick={() => setPay(true)}>Pay and extend</Button>
        </div>
      ) : (
        <Checkout
          amount={amount}
          deposit={0}
          email=""
          onPaid={async () => {
            try {
              await bookingService.extend(b.id, days, car.rates.daily)
              toast.success(`Extended to ${fmtDay(newEnd)} — receipt sent to WhatsApp`)
              onDone()
            } catch (e) {
              toast.error(e instanceof BookingConflictError ? e.message : 'Couldn’t extend. Try again.')
            }
          }}
        />
      )}
    </DialogContent>
  )
}

function ProblemDialog({ b, car, onDone }: { b: Booking; car: Car; onDone: () => void }) {
  const [kind, setKind] = useState('Breakdown')
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const send = async () => {
    setSending(true)
    await new Promise((r) => setTimeout(r, 900))
    db.set((d) => {
      d.alerts.unshift({ id: `al-${Date.now()}`, at: new Date().toISOString(), level: 'bad', kind: 'harsh', carId: car.id, bookingId: b.id, text: `${kind} reported by customer on ${carName(car)} (${b.ref})${note ? `: “${note}”` : ''}`, read: false })
    })
    setSending(false)
    toast.success('Help is on the way. A duty manager will call you within 5 minutes.')
    onDone()
  }
  return (
    <DialogContent title="Report a problem" description="If anyone is hurt or in danger, call 112 first.">
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-2">
          {['Breakdown', 'Accident', 'Flat tyre', 'Police stop', 'Lost key', 'Other'].map((k) => (
            <button key={k} type="button" onClick={() => setKind(k)} aria-pressed={kind === k} className={cn('h-11 border text-[14px] font-semibold', kind === k ? 'border-accent bg-accent text-accent-ink' : 'border-line hover:border-line-strong')}>
              {k === 'Breakdown' ? <Wrench className="mr-1.5 inline size-4" /> : null}{k}
            </button>
          ))}
        </div>
        <Field label="What happened? (optional)" htmlFor="pn">
          <Textarea id="pn" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Engine light on, car stopped near Lekki toll gate" />
        </Field>
        <p className="flex items-start gap-2 text-[13.5px] text-mute"><MapPin className="mt-0.5 size-4 shrink-0" /> We’ll use the car’s GPS location. No need to share yours.</p>
        <div className="flex flex-wrap gap-3">
          <Button size="lg" variant="danger" loading={sending} onClick={send}>Send for help</Button>
          <Button size="lg" variant="ghost" asChild><a href={`tel:${brand.contact.phoneTel}`}>Call {brand.contact.phoneDisplay}</a></Button>
        </div>
      </div>
    </DialogContent>
  )
}

function ReceiptDialog({ b, car }: { b: Booking; car: Car }) {
  const customer = useDb((s) => s.customers.find((c) => c.id === b.customerId))
  const deducted = b.deductions.reduce((s, d) => s + d.amount, 0)
  return (
    <DialogContent title={`Receipt ${b.ref}`} description={`${brand.name} · ${brand.contact.email}`}>
      <div className="text-[14.5px]" id="receipt">
        <dl className="grid grid-cols-2 gap-3">
          <div><dt className="text-mute">Billed to</dt><dd className="font-semibold">{customer?.name}</dd></div>
          <div><dt className="text-mute">Issued</dt><dd className="font-semibold">{fmtDateY(b.createdAt)}</dd></div>
          <div><dt className="text-mute">Car</dt><dd className="font-semibold">{carName(car)}</dd></div>
          <div><dt className="text-mute">Period</dt><dd className="font-semibold">{fmtDay(b.start)} → {fmtDay(b.end)}</dd></div>
        </dl>
        <ul className="mt-5 border-t border-line">
          <li className="flex justify-between border-b border-line py-2.5"><span>Rental{b.mode === 'chauffeur' ? ' with chauffeur' : ''}{b.extras.length ? ` + ${b.extras.join(', ')}` : ''}</span><span className="num">{naira(b.total)}</span></li>
          <li className="flex justify-between border-b border-line py-2.5"><span>Refundable deposit</span><span className="num">{naira(b.deposit)}</span></li>
          {deducted ? <li className="flex justify-between border-b border-line py-2.5 text-bad"><span>Deducted from deposit</span><span className="num">−{naira(deducted)}</span></li> : null}
          <li className="flex justify-between py-3 font-semibold"><span>Paid</span><span className="num">{naira(b.paid)}</span></li>
        </ul>
        <Button variant="ghost" size="sm" className="mt-4" onClick={() => window.print()}>Print / save as PDF</Button>
      </div>
    </DialogContent>
  )
}
