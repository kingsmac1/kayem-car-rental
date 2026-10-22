import { CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { audit, db, useDb } from '@/lib/db'
import { carRevenue } from '@/lib/metrics'
import { fmtDateY, naira } from '@/lib/utils'
import { carName } from '@/mocks/cars'
import { effectiveStatus } from '@/services/fleet'
import { AdminTitle, TableWrap, Td, Th } from '@/components/admin/kit'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, Panel, Pill } from '@/components/ui/misc'

export default function Partners() {
  const s = useDb((x) => x)
  const pending = s.partners.filter((p) => p.status === 'pending')
  const approved = s.partners.filter((p) => p.status !== 'pending')
  const decide = (id: string, ok: boolean) => {
    const p = s.partners.find((x) => x.id === id)!
    db.set((d) => {
      const x = d.partners.find((y) => y.id === id)!
      x.status = ok ? 'approved' : 'paused'
    })
    audit(`${ok ? 'Approved' : 'Declined'} partner ${p.name}`)
    toast.success(ok ? `${p.name} approved — book their inspection` : `${p.name} declined`)
  }
  return (
    <div>
      <AdminTitle title="Partner owners" sub="Private owners who list their cars with you. They see earnings in their own portal." />
      <Panel title={`Applications · ${pending.length}`}>
        {pending.length ? (
          <ul>
            {pending.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 border-b border-line py-3 text-[13.5px] last:border-0">
                <Avatar name={p.name} />
                <span className="min-w-0 flex-1"><span className="font-semibold">{p.name}</span><span className="block text-[12.5px] text-mute">{p.city} · {p.phone} · applied {fmtDateY(p.joined)}</span></span>
                {p.pendingCar && <Pill tone="info">{p.pendingCar.year} {p.pendingCar.make} {p.pendingCar.model}</Pill>}
                <Button size="appSm" icon={<CheckCircle2 className="size-3.5" />} onClick={() => decide(p.id, true)}>Approve</Button>
                <Button size="appSm" variant="subtle" icon={<XCircle className="size-3.5" />} onClick={() => decide(p.id, false)}>Decline</Button>
              </li>
            ))}
          </ul>
        ) : <p className="text-[13.5px] text-mute">No applications waiting.</p>}
      </Panel>
      <div className="mt-6">
        <TableWrap>
          <thead><tr><Th>Owner</Th><Th>Listed cars</Th><Th>Commission</Th><Th className="text-right">Earned (gross)</Th><Th className="text-right">Pending payout</Th><Th className="text-right">Paid out</Th><Th>Status</Th></tr></thead>
          <tbody>
            {approved.map((p) => {
              const cars = s.cars.filter((c) => c.owner === p.id)
              const gross = cars.reduce((a, c) => a + carRevenue(s, c.id), 0)
              return (
                <tr key={p.id}>
                  <Td><span className="flex items-center gap-2.5"><Avatar name={p.name} /><span><span className="font-semibold">{p.name}</span><span className="block text-[12px] text-mute">{p.city}</span></span></span></Td>
                  <Td>{cars.length ? cars.map((c) => <span key={c.id} className="block">{carName(c)} <span className="text-[12px] capitalize text-mute">· {effectiveStatus(c)}</span></span>) : <span className="text-mute">{p.pendingCar ? `${p.pendingCar.make} ${p.pendingCar.model} (inspection pending)` : '—'}</span>}</Td>
                  <Td>
                    <span className="flex items-center gap-1">
                      <Input compact type="number" defaultValue={Math.round(p.commission * 100)} className="w-16 text-right" aria-label={`${p.name} commission`} onBlur={(e) => { const v = Number(e.target.value) / 100; if (v !== p.commission) { db.set((d) => { d.partners.find((y) => y.id === p.id)!.commission = v }); audit(`Set ${p.name} commission to ${e.target.value}%`); toast.success('Commission updated') } }} />%
                    </span>
                  </Td>
                  <Td className="num text-right">{naira(gross)}</Td>
                  <Td className="num text-right text-accent">{naira(p.payoutPending)}</Td>
                  <Td className="num text-right">{naira(p.paidOut)}</Td>
                  <Td><Pill tone={p.status === 'approved' ? 'ok' : 'mute'} className="capitalize">{p.status}</Pill></Td>
                </tr>
              )
            })}
          </tbody>
        </TableWrap>
      </div>
    </div>
  )
}
