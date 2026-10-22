import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { audit, db, useDb } from '@/lib/db'
import { billable, depositSummary, outstanding, profitPerCar, revenueBetween, revenueByDay, utilisation } from '@/lib/metrics'
import { addDays, cn, downloadCsv, fmtDateY, fmtDay, naira, startOfDay } from '@/lib/utils'
import { carName } from '@/mocks/cars'
import { AdminTitle, Segmented, TableWrap, Td, Th } from '@/components/admin/kit'
import { Bars, TrendChart } from '@/components/admin/charts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Panel, Pill, Progress, Stat } from '@/components/ui/misc'

const RANGES = { '30': 30, '90': 90, '365': 365 } as const

export default function Finance() {
  const s = useDb((x) => x)
  const [range, setRange] = useState<keyof typeof RANGES>('30')
  const now = new Date()
  const from = addDays(startOfDay(now), -RANGES[range])

  const m = useMemo(() => {
    const days = revenueByDay(s, from, now)
    const weekly = range === '30' ? days.map((d) => ({ label: fmtDay(d.date).replace(/^\w+ /, ''), revenue: d.revenue })) : bucket(days, range === '90' ? 7 : 30)
    const revenue = revenueBetween(s, from, now)
    const maintenance = s.maintenance.filter((x) => new Date(x.date) >= from).reduce((a, x) => a + x.cost, 0)
    const cars = profitPerCar(s, from, now)
    const partnerPayouts = cars.reduce((a, c) => a + c.partnerShare, 0)
    return { weekly, revenue, maintenance, cars, partnerPayouts, util: utilisation(s, from, now), deposits: depositSummary(s), owed: outstanding(s).filter((o) => o.booking.status !== 'pending' && o.booking.status !== 'cancelled') }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, range])

  const invoices = s.corporates.map((c) => {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const bookings = billable(s).filter((b) => b.corporateId === c.id && new Date(b.start) >= addDays(monthStart, -30))
    return { c, bookings, amount: bookings.reduce((a, b) => a + b.total, 0), status: c.balance > c.creditLimit * 0.6 ? 'overdue' : c.balance > 0 ? 'sent' : 'paid' }
  })

  return (
    <div>
      <AdminTitle title="Finance" sub="Revenue is recognised per rental day. Profit = revenue − maintenance − partner owner share.">
        <Segmented label="Range" value={range} onChange={setRange} options={[{ id: '30', label: '30 days' }, { id: '90', label: '90 days' }, { id: '365', label: '12 months' }]} />
        <Button size="app" variant="subtle" icon={<Download className="size-4" />} onClick={() => {
          downloadCsv(`finance-${range}d.csv`, m.cars.map((r) => ({ car: carName(r.car), plate: r.car.plate, city: r.car.city, revenue: r.revenue, maintenance: r.maintenance, partner_share: r.partnerShare, profit: r.profit, utilisation_pct: Math.round(r.utilisation * 100) })))
          audit('Exported finance CSV')
        }}>Export CSV</Button>
      </AdminTitle>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Revenue" value={naira(m.revenue)} tone="accent" />
        <Stat label="Maintenance" value={naira(m.maintenance)} />
        <Stat label="Partner payouts" value={naira(m.partnerPayouts)} />
        <Stat label="Profit" value={naira(m.revenue - m.maintenance - m.partnerPayouts)} tone="ok" />
        <Stat label="Utilisation" value={`${Math.round(m.util * 100)}%`} />
      </div>
      <Panel title={`Revenue · last ${range === '365' ? '12 months' : `${range} days`}`} className="mt-6">
        {range === '30' ? <TrendChart data={m.weekly} x="label" y="revenue" height={260} /> : <Bars data={m.weekly} x="label" y="revenue" height={260} />}
      </Panel>

      <Tabs defaultValue="cars" className="mt-6">
        <TabsList>
          <TabsTrigger value="cars">Profit per car</TabsTrigger>
          <TabsTrigger value="deposits">Deposits</TabsTrigger>
          <TabsTrigger value="outstanding">Outstanding</TabsTrigger>
          <TabsTrigger value="invoices">Corporate invoices</TabsTrigger>
          <TabsTrigger value="payouts">Partner payouts</TabsTrigger>
        </TabsList>
        <TabsContent value="cars" className="pt-4">
          <div className="grid gap-6 xl:grid-cols-[1fr_1.3fr]">
            <Panel title="Profit by car (top 10)"><Bars data={m.cars.slice(0, 10).map((r) => ({ car: r.car.model.split(' ').slice(0, 2).join(' '), profit: r.profit }))} x="car" y="profit" horizontal height={340} /></Panel>
            <TableWrap>
              <thead><tr><Th>Car</Th><Th className="text-right">Revenue</Th><Th className="text-right">Maintenance</Th><Th className="text-right">Partner</Th><Th className="text-right">Profit</Th><Th>Utilisation</Th></tr></thead>
              <tbody>
                {m.cars.map((r) => (
                  <tr key={r.car.id}>
                    <Td><span className="font-semibold">{carName(r.car)}</span><span className="block text-[12px] text-mute">{r.car.city}{r.car.owner !== 'company' ? ' · partner car' : ''}</span></Td>
                    <Td className="num text-right">{naira(r.revenue)}</Td>
                    <Td className="num text-right text-mute">{naira(r.maintenance)}</Td>
                    <Td className="num text-right text-mute">{r.partnerShare ? naira(r.partnerShare) : '—'}</Td>
                    <Td className={cn('num text-right', r.profit < 0 ? 'text-bad' : 'text-paper')}>{naira(r.profit)}</Td>
                    <Td className="w-40"><div className="flex items-center gap-2"><Progress value={r.utilisation * 100} /><span className="num w-9 text-right text-[12px]">{Math.round(r.utilisation * 100)}%</span></div></Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </div>
        </TabsContent>
        <TabsContent value="deposits" className="pt-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat label="Held now" value={naira(m.deposits.held)} tone="accent" sub={`${s.bookings.filter((b) => b.depositStatus === 'held').length} bookings`} />
            <Stat label="Refunded (all time)" value={naira(m.deposits.refunded)} tone="ok" />
            <Stat label="Deducted (all time)" value={naira(m.deposits.deducted)} tone="warn" />
          </div>
          <div className="mt-4">
            <TableWrap>
              <thead><tr><Th>Booking</Th><Th>Customer</Th><Th>Deduction</Th><Th className="text-right">Amount</Th></tr></thead>
              <tbody>
                {s.bookings.filter((b) => b.deductions.length).flatMap((b) => b.deductions.map((d, i) => (
                  <tr key={b.id + i}>
                    <Td className="num">{b.ref}</Td>
                    <Td>{s.customers.find((c) => c.id === b.customerId)?.name}</Td>
                    <Td><Pill tone="warn" className="mr-2 capitalize">{d.kind}</Pill>{d.label}</Td>
                    <Td className="num text-right">{naira(d.amount)}</Td>
                  </tr>
                )))}
              </tbody>
            </TableWrap>
          </div>
        </TabsContent>
        <TabsContent value="outstanding" className="pt-4">
          <TableWrap>
            <thead><tr><Th>Booking</Th><Th>Customer</Th><Th>Status</Th><Th>Dates</Th><Th className="text-right">Owed</Th><Th /></tr></thead>
            <tbody>
              {m.owed.map(({ booking: b, due }) => (
                <tr key={b.id}>
                  <Td className="num">{b.ref}</Td>
                  <Td>{s.customers.find((c) => c.id === b.customerId)?.name}</Td>
                  <Td className="capitalize">{b.status}</Td>
                  <Td className="text-mute">{fmtDay(b.start)} → {fmtDay(b.end)}</Td>
                  <Td className="num text-right text-warn">{naira(due)}</Td>
                  <Td className="text-right"><Button size="appSm" variant="subtle" onClick={() => { db.set((d) => { const x = d.bookings.find((y) => y.id === b.id); if (x) x.paid = x.total }); audit(`Recorded payment for ${b.ref}`); toast.success('Payment recorded') }}>Mark paid</Button></Td>
                </tr>
              ))}
              {!m.owed.length && <tr><Td className="text-mute">Everything is paid. 🎉</Td></tr>}
            </tbody>
          </TableWrap>
        </TabsContent>
        <TabsContent value="invoices" className="pt-4">
          <TableWrap>
            <thead><tr><Th>Company</Th><Th>Trips (30d)</Th><Th className="text-right">Invoice</Th><Th className="text-right">Balance</Th><Th>Status</Th><Th /></tr></thead>
            <tbody>
              {invoices.map(({ c, bookings, amount, status }) => (
                <tr key={c.id}>
                  <Td><span className="font-semibold">{c.name}</span><span className="block text-[12px] text-mute">{c.kind} · credit {naira(c.creditLimit)}</span></Td>
                  <Td className="num">{bookings.length}</Td>
                  <Td className="num text-right">{naira(amount)}</Td>
                  <Td className="num text-right">{naira(c.balance)}</Td>
                  <Td><Pill tone={status === 'overdue' ? 'bad' : status === 'sent' ? 'warn' : 'ok'} className="capitalize">{status}</Pill></Td>
                  <Td className="text-right"><Button size="appSm" variant="subtle" onClick={() => { downloadCsv(`invoice-${c.id}.csv`, bookings.map((b) => ({ ref: b.ref, start: b.start.slice(0, 10), end: b.end.slice(0, 10), car: carName(s.cars.find((x) => x.id === b.carId)!), amount: b.total }))); toast.success('Invoice exported') }}>Download</Button></Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </TabsContent>
        <TabsContent value="payouts" className="pt-4">
          <TableWrap>
            <thead><tr><Th>Partner</Th><Th>Cars</Th><Th>Commission</Th><Th className="text-right">Pending payout</Th><Th className="text-right">Paid to date</Th><Th /></tr></thead>
            <tbody>
              {s.partners.filter((p) => p.status === 'approved').map((p) => (
                <tr key={p.id}>
                  <Td className="font-semibold">{p.name}</Td>
                  <Td>{s.cars.filter((c) => c.owner === p.id).map((c) => c.model).join(', ') || '—'}</Td>
                  <Td className="num">{Math.round(p.commission * 100)}%</Td>
                  <Td className="num text-right text-accent">{naira(p.payoutPending)}</Td>
                  <Td className="num text-right">{naira(p.paidOut)}</Td>
                  <Td className="text-right"><Button size="appSm" variant="subtle" disabled={!p.payoutPending} onClick={() => { db.set((d) => { const x = d.partners.find((y) => y.id === p.id); if (x) { x.paidOut += x.payoutPending; x.payoutPending = 0 } }); audit(`Paid out ${naira(p.payoutPending)} to ${p.name}`); toast.success(`Payout sent to ${p.name}`) }}>Pay now</Button></Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          <p className="mt-2 text-[12.5px] text-mute">Payouts run on the 5th of each month. Last run {fmtDateY(new Date(now.getFullYear(), now.getMonth(), 5))}.</p>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function bucket(days: { date: string; revenue: number }[], size: number) {
  const out: { label: string; revenue: number }[] = []
  for (let i = 0; i < days.length; i += size) {
    const chunk = days.slice(i, i + size)
    out.push({ label: size >= 28 ? new Date(chunk[0].date).toLocaleDateString('en-GB', { month: 'short' }) : fmtDay(chunk[0].date).replace(/^\w+ /, ''), revenue: chunk.reduce((a, d) => a + d.revenue, 0) })
  }
  return out
}
