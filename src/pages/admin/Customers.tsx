import { useMemo, useState } from 'react'
import { Ban, CheckCircle2, Clock, ShieldAlert, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { audit, currentStaff, db, useDb, useSession } from '@/lib/db'
import { customerLtv } from '@/lib/metrics'
import { seesMoney } from '@/lib/roles'
import { fmtDateY, naira } from '@/lib/utils'
import { carName } from '@/mocks/cars'
import type { Customer } from '@/mocks/types'
import { AdminTitle, BookingStatus, SearchBox, Segmented, TableWrap, Td, Th } from '@/components/admin/kit'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { Avatar, Pill } from '@/components/ui/misc'

const VER: Record<Customer['verification'], { tone: 'ok' | 'warn' | 'bad' | 'mute'; label: string; icon: typeof CheckCircle2 }> = {
  verified: { tone: 'ok', label: 'Verified', icon: CheckCircle2 },
  review: { tone: 'warn', label: 'Needs review', icon: Clock },
  failed: { tone: 'bad', label: 'Failed', icon: XCircle },
  none: { tone: 'mute', label: 'Not verified', icon: Clock },
}

export default function Customers() {
  const s = useDb((x) => x)
  const money = seesMoney(useSession().staff!.role)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | 'review' | 'risk' | 'blacklist'>('all')
  const [openId, setOpenId] = useState<string | null>(null)

  const rows = useMemo(
    () =>
      s.customers
        .map((c) => ({ c, ltv: customerLtv(s, c.id), trips: s.bookings.filter((b) => b.customerId === c.id && b.status !== 'cancelled').length }))
        .filter(({ c }) => (filter === 'all' ? true : filter === 'review' ? c.verification === 'review' || c.verification === 'failed' : filter === 'risk' ? c.risk !== 'low' : !!c.blacklist))
        .filter(({ c }) => !q || `${c.name} ${c.phone} ${c.email}`.toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => b.ltv - a.ltv),
    [s, q, filter],
  )
  const selected = s.customers.find((c) => c.id === openId)

  return (
    <div>
      <AdminTitle title="Customers" sub={`${s.customers.length} customers · ${s.customers.filter((c) => c.verification === 'review').length} waiting for ID review`} />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchBox value={q} onChange={setQ} placeholder="Search name, phone, email" />
        <Segmented label="Filter" value={filter} onChange={setFilter} options={[{ id: 'all', label: 'All' }, { id: 'review', label: 'ID review' }, { id: 'risk', label: 'Risk flags' }, { id: 'blacklist', label: 'Blacklist' }]} />
      </div>
      <TableWrap>
        <thead>
          <tr><Th>Customer</Th><Th>City</Th><Th>Verification</Th><Th>Risk</Th><Th className="text-right">Trips</Th>{money && <Th className="text-right">Lifetime value</Th>}<Th>Joined</Th></tr>
        </thead>
        <tbody>
          {rows.map(({ c, ltv, trips }) => {
            const v = VER[c.verification]
            return (
              <tr key={c.id} className="cursor-pointer hover:bg-paper/[0.03]" onClick={() => setOpenId(c.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setOpenId(c.id)}>
                <Td><span className="flex items-center gap-2.5"><Avatar name={c.name} /><span><span className="font-semibold">{c.name}</span>{c.blacklist ? <Pill tone="bad" className="ml-2">Blacklisted</Pill> : null}<span className="block text-[12px] text-mute">{c.phone}</span></span></span></Td>
                <Td>{c.city}</Td>
                <Td><Pill tone={v.tone}><v.icon className="size-3.5" />{v.label}</Pill></Td>
                <Td>{c.risk === 'low' ? <span className="text-mute">Low</span> : <Pill tone={c.risk === 'high' ? 'bad' : 'warn'} className="capitalize">{c.risk}</Pill>}</Td>
                <Td className="num text-right">{trips}</Td>
                {money && <Td className="num text-right">{naira(ltv)}</Td>}
                <Td className="text-mute">{fmtDateY(c.joined)}</Td>
              </tr>
            )
          })}
        </tbody>
      </TableWrap>
      <Dialog open={!!selected} onOpenChange={(o) => !o && setOpenId(null)}>
        {selected && <CustomerDrawer c={selected} money={money} />}
      </Dialog>
    </div>
  )
}

function CustomerDrawer({ c, money }: { c: Customer; money: boolean }) {
  const s = useDb((x) => x)
  const [note, setNote] = useState('')
  const [reason, setReason] = useState('')
  const bookings = s.bookings.filter((b) => b.customerId === c.id).sort((a, b) => +new Date(b.start) - +new Date(a.start))
  const v = VER[c.verification]
  const update = (fn: (x: Customer) => void, msg: string) => {
    db.set((d) => {
      const x = d.customers.find((y) => y.id === c.id)
      if (x) fn(x)
    })
    audit(msg)
    toast.success(msg)
  }
  const corp = s.corporates.find((x) => x.id === c.corporateId)

  return (
    <DialogContent side="right" title={c.name} description={`${c.phone} · ${c.email}`}>
      <div className="flex flex-col gap-6 text-[13.5px]">
        <div className="grid grid-cols-3 gap-2">
          <div className="border border-line p-3"><p className="text-[12px] text-mute">Trips</p><p className="num text-lg">{bookings.filter((b) => b.status !== 'cancelled').length}</p></div>
          {money && <div className="border border-line p-3"><p className="text-[12px] text-mute">Lifetime value</p><p className="num text-lg text-accent">{naira(customerLtv(s, c.id))}</p></div>}
          <div className="border border-line p-3"><p className="text-[12px] text-mute">Points</p><p className="num text-lg">{c.points.toLocaleString()}</p></div>
        </div>
        {c.blacklist && (
          <div className="border border-bad/40 bg-bad/8 p-3">
            <p className="flex items-center gap-2 font-semibold text-bad"><Ban className="size-4" /> Blacklisted</p>
            <p className="mt-1">{c.blacklist.reason}</p>
            <p className="mt-1 text-[12px] text-mute">By {c.blacklist.by} · {fmtDateY(c.blacklist.date)}</p>
            <Button size="appSm" variant="subtle" className="mt-2" onClick={() => update((x) => { x.blacklist = undefined; x.risk = 'medium' }, `Removed ${c.name} from blacklist`)}>Remove from blacklist</Button>
          </div>
        )}
        <section>
          <p className="mb-2 text-xs font-semibold text-mute">Verification</p>
          <div className="border border-line">
            <div className="flex items-center justify-between border-b border-line px-3 py-2"><span>Overall</span><Pill tone={v.tone}><v.icon className="size-3.5" />{v.label}</Pill></div>
            <div className="flex justify-between border-b border-line px-3 py-2"><span>NIN (NIMC)</span><span className={c.verificationDetail?.nin === 'match' ? 'text-ok' : c.verificationDetail?.nin === 'mismatch' ? 'text-bad' : 'text-warn'}>{c.verificationDetail?.nin ?? '—'}</span></div>
            <div className="flex justify-between border-b border-line px-3 py-2"><span>Driver’s licence (FRSC)</span><span className={c.verificationDetail?.licence === 'valid' ? 'text-ok' : c.verificationDetail?.licence === 'expired' ? 'text-bad' : 'text-warn'}>{c.verificationDetail?.licence ?? '—'}</span></div>
            <div className="flex justify-between px-3 py-2"><span>Selfie match</span><span className="num">{c.verificationDetail ? `${c.verificationDetail.selfie}%` : '—'}</span></div>
          </div>
          {c.verification === 'review' && (
            <div className="mt-2 flex gap-2">
              <Button size="appSm" onClick={() => update((x) => { x.verification = 'verified'; if (x.verificationDetail) x.verificationDetail.nin = 'match' }, `Approved ID for ${c.name}`)}>Approve ID</Button>
              <Button size="appSm" variant="subtle" className="text-bad" onClick={() => update((x) => { x.verification = 'failed' }, `Rejected ID for ${c.name}`)}>Reject</Button>
            </div>
          )}
          <p className="mt-2 text-[12px] text-mute">Only results are stored — never the NIN or the selfie image.</p>
        </section>
        <section>
          <p className="mb-2 text-xs font-semibold text-mute">Risk flags</p>
          {c.riskFlags.length ? (
            <ul className="flex flex-wrap gap-1.5">{c.riskFlags.map((f) => <li key={f}><Pill tone="warn"><ShieldAlert className="size-3.5" />{f}</Pill></li>)}</ul>
          ) : (
            <p className="text-mute">No risk flags.</p>
          )}
        </section>
        <section>
          <p className="mb-2 text-xs font-semibold text-mute">Details</p>
          <dl className="grid grid-cols-2 gap-2">
            <div><dt className="text-mute">City</dt><dd>{c.city}</dd></div>
            <div><dt className="text-mute">Joined</dt><dd>{fmtDateY(c.joined)}</dd></div>
            <div><dt className="text-mute">Referral code</dt><dd className="num">{c.referralCode}</dd></div>
            <div><dt className="text-mute">Corporate</dt><dd>{corp?.name ?? '—'}</dd></div>
          </dl>
        </section>
        <section>
          <p className="mb-2 text-xs font-semibold text-mute">Booking history</p>
          <ul>
            {bookings.slice(0, 10).map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-2 border-b border-line py-2">
                <span><span className="num">{b.ref}</span> · {carName(s.cars.find((x) => x.id === b.carId)!)}<span className="block text-[12px] text-mute">{fmtDateY(b.start)}{money ? ` · ${naira(b.total)}` : ''}</span></span>
                <BookingStatus status={b.status} />
              </li>
            ))}
            {!bookings.length && <li className="text-mute">No bookings yet.</li>}
          </ul>
        </section>
        <section>
          <p className="mb-2 text-xs font-semibold text-mute">Notes</p>
          <ul className="mb-2 flex flex-col gap-1.5">{c.notes.map((n, i) => <li key={i} className="border-l-2 border-line pl-2.5">{n}</li>)}</ul>
          <div className="flex gap-2">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note for the team" className="min-h-16 text-sm" aria-label="New note" />
            <Button size="app" variant="subtle" disabled={!note.trim()} onClick={() => { update((x) => { x.notes.push(`${note.trim()} — ${currentStaff().name}`) }, `Added note to ${c.name}`); setNote('') }}>Add</Button>
          </div>
        </section>
        {!c.blacklist && (
          <section className="border-t border-line pt-4">
            <p className="mb-2 text-xs font-semibold text-mute">Blacklist</p>
            <div className="flex gap-2">
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required) — e.g. returned car 2 days late, unreachable" className="min-h-16 text-sm" aria-label="Blacklist reason" />
              <Button size="app" variant="danger" disabled={reason.trim().length < 8} onClick={() => update((x) => { x.blacklist = { reason: reason.trim(), date: new Date().toISOString(), by: currentStaff().name }; x.risk = 'high' }, `Blacklisted ${c.name}`)}>Blacklist</Button>
            </div>
            <p className="mt-1.5 text-[12px] text-mute">Blacklisted customers can’t be booked from the admin or the website.</p>
          </section>
        )}
      </div>
    </DialogContent>
  )
}
