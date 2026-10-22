import { useMemo, useState } from 'react'
import { Lightbulb, Plus, TrendingDown, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { audit, db, useDb } from '@/lib/db'
import { profitPerCar } from '@/lib/metrics'
import { quote } from '@/lib/pricing'
import { addDays, fmtDateY, naira, startOfDay } from '@/lib/utils'
import { carName } from '@/mocks/cars'
import type { PricingRules } from '@/mocks/types'
import { AdminTitle, TableWrap, Td, Th } from '@/components/admin/kit'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Panel, Pill } from '@/components/ui/misc'

const pct = (n: number) => `${Math.round(n * 100)}%`

function NumberRule({ label, value, onSave }: { label: string; value: number; onSave: (v: number) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 border-b border-line py-2.5 text-[13.5px]">
      <span>{label}</span>
      <span className="flex items-center gap-1">
        <Input compact type="number" defaultValue={Math.round(value * 100)} onBlur={(e) => { const v = Number(e.target.value) / 100; if (v !== value) { onSave(v); toast.success(`${label} set to ${e.target.value}%`) } }} className="w-20 text-right" aria-label={label} />
        <span className="text-mute">%</span>
      </span>
    </label>
  )
}

export default function Pricing() {
  const s = useDb((x) => x)
  const r = s.pricing
  const [code, setCode] = useState('')
  const [disc, setDisc] = useState('10')
  const setRules = (fn: (p: PricingRules) => void, msg: string) => {
    db.set((d) => fn(d.pricing))
    audit(msg)
  }

  const suggestions = useMemo(() => {
    const rows = profitPerCar(s, addDays(startOfDay(), -30), new Date())
    return [
      ...rows.filter((x) => x.utilisation < 0.25).map((x) => ({ car: x.car, kind: 'down' as const, text: `${carName(x.car)} was booked only ${Math.round(x.utilisation * 100)}% of the last 30 days. Try −10% (${naira(Math.round(x.car.rates.daily * 0.9 / 500) * 500)}/day) or move it to a busier city.`, next: Math.round(x.car.rates.daily * 0.9 / 500) * 500 })),
      ...rows.filter((x) => x.utilisation > 0.7).map((x) => ({ car: x.car, kind: 'up' as const, text: `${carName(x.car)} is almost always sold out (${Math.round(x.utilisation * 100)}%). You could raise it +10% to ${naira(Math.round(x.car.rates.daily * 1.1 / 500) * 500)}/day.`, next: Math.round(x.car.rates.daily * 1.1 / 500) * 500 })),
    ].slice(0, 6)
  }, [s])

  // Example: what a 5-day weekend-spanning hire of the first car costs with today's rules.
  const sample = useMemo(() => {
    const car = s.cars[0]
    const start = addDays(startOfDay(), ((5 - new Date().getDay() + 7) % 7) || 7)
    start.setHours(10)
    return { car, q: quote({ car, start, end: addDays(start, 5), mode: 'self-drive', extras: [], rules: r }) }
  }, [s.cars, r])

  return (
    <div>
      <AdminTitle title="Pricing rules" sub="Rules stack: base rate → season → weekend → same-day → long-stay → corporate / promo." />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-6">
          <Panel title="Season & event rules">
            <ul>
              {r.seasons.map((x, i) => (
                <li key={x.id} className="flex flex-wrap items-center gap-3 border-b border-line py-3 last:border-0">
                  <Switch checked={x.active} onCheckedChange={(v) => setRules((p) => { p.seasons[i].active = v }, `${v ? 'Enabled' : 'Disabled'} ${x.name}`)} aria-label={`Enable ${x.name}`} />
                  <span className="min-w-0 flex-1 text-[13.5px]"><span className="font-semibold">{x.name}</span><span className="block text-[12px] text-mute">{fmtDateY(x.from)} → {fmtDateY(x.to)}</span></span>
                  <span className="flex items-center gap-1 text-[13.5px]">+<Input compact type="number" defaultValue={Math.round(x.uplift * 100)} onBlur={(e) => { const v = Number(e.target.value) / 100; if (v !== x.uplift) { setRules((p) => { p.seasons[i].uplift = v }, `Changed ${x.name} uplift to ${e.target.value}%`); toast.success('Saved') } }} className="w-16 text-right" aria-label={`${x.name} uplift`} />%</span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Adjustments">
            <NumberRule label="Weekend uplift (Sat & Sun)" value={r.weekendUplift} onSave={(v) => setRules((p) => { p.weekendUplift = v }, 'Changed weekend uplift')} />
            <NumberRule label="Event pricing uplift" value={r.eventUplift} onSave={(v) => setRules((p) => { p.eventUplift = v }, 'Changed event uplift')} />
            <NumberRule label="Same-day booking premium" value={r.sameDayPremium} onSave={(v) => setRules((p) => { p.sameDayPremium = v }, 'Changed same-day premium')} />
            <NumberRule label="Corporate rate discount" value={r.corporateDiscount} onSave={(v) => setRules((p) => { p.corporateDiscount = v }, 'Changed corporate discount')} />
            <NumberRule label="Loyalty discount (5+ trips)" value={r.loyaltyDiscount} onSave={(v) => setRules((p) => { p.loyaltyDiscount = v }, 'Changed loyalty discount')} />
            {r.longStay.map((l, i) => (
              <NumberRule key={l.minDays} label={`Long-stay discount (${l.minDays}+ days)`} value={l.discount} onSave={(v) => setRules((p) => { p.longStay[i].discount = v }, `Changed ${l.minDays}+ day discount`)} />
            ))}
          </Panel>
          <Panel title="Base rates per car">
            <TableWrap>
              <thead><tr><Th>Car</Th><Th>City</Th><Th className="text-right">Daily (₦)</Th><Th className="text-right">Weekly</Th><Th className="text-right">Monthly</Th></tr></thead>
              <tbody>
                {s.cars.map((c) => (
                  <tr key={c.id}>
                    <Td className="font-semibold">{carName(c)}</Td>
                    <Td className="text-mute">{c.city}</Td>
                    <Td className="text-right">
                      <Input compact type="number" step={5000} defaultValue={c.rates.daily} aria-label={`Daily rate for ${carName(c)}`} className="ml-auto w-28 text-right"
                        onBlur={(e) => { const v = Number(e.target.value); if (v > 0 && v !== c.rates.daily) { db.set((d) => { const x = d.cars.find((y) => y.id === c.id)!; x.rates = { hourly: Math.round(v * 0.16), daily: v, weekly: Math.round(v * 6.2), monthly: Math.round(v * 22) } }); audit(`Changed ${carName(c)} daily rate to ${naira(v)}`); toast.success('Rate updated') } }} />
                    </Td>
                    <Td className="num text-right text-mute">{naira(c.rates.weekly)}</Td>
                    <Td className="num text-right text-mute">{naira(c.rates.monthly)}</Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </Panel>
        </div>
        <div className="flex flex-col gap-6">
          <Panel title={<span className="flex items-center gap-2"><Lightbulb className="size-4 text-accent" />Smart suggestions</span>}>
            {suggestions.length ? (
              <ul className="flex flex-col gap-3">
                {suggestions.map((x) => (
                  <li key={x.car.id + x.kind} className="border border-line p-3 text-[13.5px]">
                    <p className="flex gap-2">{x.kind === 'up' ? <TrendingUp className="mt-0.5 size-4 shrink-0 text-ok" /> : <TrendingDown className="mt-0.5 size-4 shrink-0 text-warn" />}{x.text}</p>
                    <Button size="appSm" variant="subtle" className="mt-2" onClick={() => { db.set((d) => { const c = d.cars.find((y) => y.id === x.car.id)!; c.rates = { hourly: Math.round(x.next * 0.16), daily: x.next, weekly: Math.round(x.next * 6.2), monthly: Math.round(x.next * 22) } }); audit(`Applied pricing suggestion to ${carName(x.car)}`); toast.success(`${carName(x.car)} now ${naira(x.next)}/day`) }}>Apply {naira(x.next)}/day</Button>
                  </li>
                ))}
              </ul>
            ) : <p className="text-[13.5px] text-mute">Pricing looks balanced — no cars are always idle or always sold out.</p>}
          </Panel>
          <Panel title="Rule preview">
            <p className="text-[13px] text-mute">{carName(sample.car)}, 5 days from this Friday:</p>
            <ul className="mt-2 flex flex-col gap-1.5 text-[13px]">
              {sample.q.lines.map((l) => <li key={l.label} className="flex justify-between gap-3"><span>{l.label}</span><span className="num">{naira(l.amount)}</span></li>)}
              <li className="mt-1 flex justify-between border-t border-line pt-2 font-semibold"><span>Total</span><span className="num">{naira(sample.q.total)}</span></li>
            </ul>
          </Panel>
          <Panel title="Promo codes">
            <ul>
              {r.promos.map((p, i) => (
                <li key={p.code} className="flex items-center gap-3 border-b border-line py-2.5 text-[13.5px] last:border-0">
                  <Switch checked={p.active} onCheckedChange={(v) => setRules((x) => { x.promos[i].active = v }, `${v ? 'Activated' : 'Paused'} promo ${p.code}`)} aria-label={`Activate ${p.code}`} />
                  <span className="flex-1"><span className="num font-semibold">{p.code}</span> <span className="text-mute">−{pct(p.discount)}</span><span className="block text-[12px] text-mute">{p.uses}/{p.limit} used · ends {fmtDateY(p.expires)}</span></span>
                  {new Date(p.expires) < new Date() ? <Pill tone="mute">Expired</Pill> : p.uses >= p.limit ? <Pill tone="warn">Used up</Pill> : null}
                </li>
              ))}
            </ul>
            <form className="mt-3 flex gap-2" onSubmit={(e) => {
              e.preventDefault()
              const c = code.trim().toUpperCase()
              if (!/^[A-Z0-9]{4,14}$/.test(c) || r.promos.some((p) => p.code === c)) { toast.error('Use 4–14 letters/numbers, not already in use.'); return }
              setRules((x) => { x.promos.unshift({ code: c, discount: Number(disc) / 100, uses: 0, limit: 100, expires: addDays(new Date(), 30).toISOString(), active: true }) }, `Created promo code ${c}`)
              toast.success(`Promo ${c} created`)
              setCode('')
            }}>
              <Input compact placeholder="NEWCODE" value={code} onChange={(e) => setCode(e.target.value)} aria-label="New promo code" />
              <Input compact type="number" value={disc} onChange={(e) => setDisc(e.target.value)} className="w-20" aria-label="Discount percent" />
              <Button type="submit" size="app" variant="subtle" icon={<Plus className="size-4" />}>Add</Button>
            </form>
          </Panel>
        </div>
      </div>
    </div>
  )
}
