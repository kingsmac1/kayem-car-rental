import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { audit, db, useDb } from '@/lib/db'
import { billable } from '@/lib/metrics'
import { fmtDateY, naira } from '@/lib/utils'
import { carName } from '@/mocks/cars'
import type { CorporateAccount } from '@/mocks/types'
import { AdminTitle } from '@/components/admin/kit'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Panel, Pill, Progress } from '@/components/ui/misc'

export default function Corporate() {
  const s = useDb((x) => x)
  const [openId, setOpenId] = useState<string | null>(null)
  const sel = s.corporates.find((c) => c.id === openId)
  return (
    <div>
      <AdminTitle title="Corporate accounts" sub={`${s.corporates.length} companies, embassies, hotels and event planners on credit terms`} />
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {s.corporates.map((c) => {
          const trips = billable(s).filter((b) => b.corporateId === c.id)
          const used = c.balance / c.creditLimit
          return (
            <li key={c.id}>
              <button type="button" onClick={() => setOpenId(c.id)} className="w-full border border-line bg-ink-2 p-4 text-left hover:border-line-strong">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="font-semibold">{c.name}</p><p className="text-[12.5px] text-mute">{c.kind} · {c.city} · since {fmtDateY(c.since)}</p></div>
                  <Pill tone="accent">−{Math.round(c.discount * 100)}%</Pill>
                </div>
                <div className="mt-4 text-[12.5px]">
                  <div className="flex justify-between"><span className="text-mute">Credit used</span><span className="num">{naira(c.balance)} / {naira(c.creditLimit)}</span></div>
                  <Progress value={used * 100} tone={used > 0.8 ? 'bad' : used > 0.5 ? 'warn' : 'ok'} className="mt-1.5" />
                </div>
                <p className="mt-3 text-[12.5px] text-mute">{trips.length} trips · {c.bookers.length} staff bookers</p>
              </button>
            </li>
          )
        })}
      </ul>
      <Dialog open={!!sel} onOpenChange={(o) => !o && setOpenId(null)}>{sel && <CorpDrawer c={sel} />}</Dialog>
    </div>
  )
}

function CorpDrawer({ c }: { c: CorporateAccount }) {
  const s = useDb((x) => x)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [limit, setLimit] = useState(String(c.creditLimit))
  const trips = billable(s).filter((b) => b.corporateId === c.id).sort((a, b) => +new Date(b.start) - +new Date(a.start))
  const months = new Map<string, number>()
  for (const b of trips) {
    const k = new Date(b.start).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    months.set(k, (months.get(k) ?? 0) + b.total)
  }
  const update = (fn: (x: CorporateAccount) => void, msg: string) => {
    db.set((d) => fn(d.corporates.find((y) => y.id === c.id)!))
    audit(msg)
    toast.success(msg)
  }
  return (
    <DialogContent side="right" title={c.name} description={`${c.contact} · ${c.email}`}>
      <div className="flex flex-col gap-6 text-[13.5px]">
        <Panel title="Credit limit">
          <div className="flex gap-2">
            <Input compact type="number" value={limit} onChange={(e) => setLimit(e.target.value)} aria-label="Credit limit" />
            <Button size="app" variant="subtle" onClick={() => update((x) => { x.creditLimit = Number(limit) }, `Set ${c.name} credit limit to ${naira(Number(limit))}`)}>Save</Button>
          </div>
          <p className="mt-2 text-mute">Balance {naira(c.balance)} · corporate rate −{Math.round(c.discount * 100)}%</p>
        </Panel>
        <Panel title="Staff bookers">
          <ul>
            {c.bookers.map((b) => (
              <li key={b.email} className="flex items-center justify-between gap-2 border-b border-line py-2 last:border-0">
                <span><span className="font-semibold">{b.name}</span> <Pill tone="mute" className="ml-1">{b.role}</Pill><span className="block text-[12px] text-mute">{b.email}</span></span>
                {b.role !== 'Admin' && <button type="button" aria-label={`Remove ${b.name}`} className="text-mute hover:text-bad" onClick={() => update((x) => { x.bookers = x.bookers.filter((y) => y.email !== b.email) }, `Removed booker ${b.name}`)}><Trash2 className="size-4" /></button>}
              </li>
            ))}
          </ul>
          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!name || !/\S+@\S+/.test(email)) return; update((x) => { x.bookers.push({ name, email, role: 'Booker' }) }, `Added booker ${name} to ${c.name}`); setName(''); setEmail('') }}>
            <Input compact placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Booker name" />
            <Input compact placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Booker email" />
            <Button type="submit" size="app" variant="subtle" aria-label="Add booker"><Plus className="size-4" /></Button>
          </form>
        </Panel>
        <Panel title="Monthly invoices">
          <ul>
            {[...months.entries()].slice(0, 6).map(([m, total], i) => (
              <li key={m} className="flex items-center justify-between border-b border-line py-2 last:border-0"><span>{m}</span><span className="flex items-center gap-2"><span className="num">{naira(total)}</span><Pill tone={i === 0 ? 'warn' : 'ok'}>{i === 0 ? 'Open' : 'Paid'}</Pill></span></li>
            ))}
            {!months.size && <li className="text-mute">No trips yet.</li>}
          </ul>
        </Panel>
        <Panel title="Recent trips">
          <ul>{trips.slice(0, 8).map((b) => <li key={b.id} className="flex justify-between border-b border-line py-2 last:border-0"><span><span className="num">{b.ref}</span> · {carName(s.cars.find((x) => x.id === b.carId)!)}</span><span className="num">{naira(b.total)}</span></li>)}</ul>
        </Panel>
      </div>
    </DialogContent>
  )
}
