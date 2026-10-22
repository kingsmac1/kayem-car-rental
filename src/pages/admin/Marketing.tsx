import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Send, Star } from 'lucide-react'
import { toast } from 'sonner'
import { audit, db, useDb } from '@/lib/db'
import { fmtDateY, naira } from '@/lib/utils'
import { carName } from '@/mocks/cars'
import { notificationService } from '@/services/notifications'
import { AdminTitle, TableWrap, Td, Th } from '@/components/admin/kit'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Panel, Pill, Stat } from '@/components/ui/misc'

export default function Marketing() {
  const s = useDb((x) => x)
  const [sending, setSending] = useState<string | null>(null)
  const reviewed = s.reviews.filter((r) => r.status === 'reviewed')
  const avg = reviewed.length ? reviewed.reduce((a, r) => a + r.rating, 0) / reviewed.length : 0
  // Recently closed trips without a review request yet.
  const toAsk = s.bookings.filter((b) => b.status === 'closed' && !s.reviews.some((r) => r.bookingId === b.id)).slice(0, 6)

  const ask = async (bookingId: string) => {
    const b = s.bookings.find((x) => x.id === bookingId)!
    const c = s.customers.find((x) => x.id === b.customerId)!
    setSending(bookingId)
    await notificationService.requestReview(c.phone, c.name)
    db.set((d) => {
      d.reviews.unshift({ id: `r-${Date.now()}`, bookingId, customerId: c.id, rating: 0, text: '', requested: new Date().toISOString(), status: 'requested' })
    })
    audit(`Sent Google review request to ${c.name}`)
    setSending(null)
    toast.success(`Review request sent to ${c.name} on WhatsApp`)
  }

  return (
    <div>
      <AdminTitle title="Marketing" sub="Referrals, promo codes and Google review requests after every trip." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Referrals" value={s.referrals.length} sub={`${s.referrals.filter((r) => r.status === 'rewarded').length} rewarded`} />
        <Stat label="Active promo codes" value={s.pricing.promos.filter((p) => p.active).length} sub={`${s.pricing.promos.reduce((a, p) => a + p.uses, 0)} total uses`} />
        <Stat label="Average rating" value={<span className="inline-flex items-center gap-1">{avg.toFixed(1)}<Star className="size-4 fill-accent text-accent" /></span>} sub={`${reviewed.length} reviews`} />
        <Stat label="Review requests pending" value={s.reviews.filter((r) => r.status === 'requested').length} />
      </div>
      <Tabs defaultValue="reviews" className="mt-6">
        <TabsList>
          <TabsTrigger value="reviews">Review requests</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="promos">Promo codes</TabsTrigger>
        </TabsList>
        <TabsContent value="reviews" className="pt-4">
          <div className="grid gap-6 xl:grid-cols-2">
            <Panel title="Ask for a Google review">
              {toAsk.length ? (
                <ul>
                  {toAsk.map((b) => (
                    <li key={b.id} className="flex items-center justify-between gap-3 border-b border-line py-2.5 text-[13.5px] last:border-0">
                      <span><span className="font-semibold">{s.customers.find((c) => c.id === b.customerId)?.name}</span><span className="block text-[12px] text-mute">{carName(s.cars.find((c) => c.id === b.carId)!)} · returned {fmtDateY(b.end)}</span></span>
                      <Button size="appSm" variant="subtle" loading={sending === b.id} icon={<Send className="size-3.5" />} onClick={() => ask(b.id)}>Send request</Button>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-[13.5px] text-mute">Everyone who finished a trip has been asked.</p>}
              <p className="mt-3 text-[12px] text-mute">Sent on WhatsApp 2 hours after a clean return, with a direct Google review link.</p>
            </Panel>
            <Panel title="Latest reviews">
              <ul>
                {s.reviews.slice(0, 8).map((r) => (
                  <li key={r.id} className="border-b border-line py-2.5 text-[13.5px] last:border-0">
                    <p className="flex items-center justify-between gap-2"><span className="font-semibold">{s.customers.find((c) => c.id === r.customerId)?.name}</span>{r.status === 'reviewed' ? <span className="num text-accent">{'★'.repeat(r.rating)}</span> : <Pill tone="mute">Requested</Pill>}</p>
                    {r.text && <p className="mt-1 text-paper/80">“{r.text}”</p>}
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </TabsContent>
        <TabsContent value="referrals" className="pt-4">
          <TableWrap>
            <thead><tr><Th>Referrer</Th><Th>Friend</Th><Th>Date</Th><Th>Status</Th><Th className="text-right">Reward</Th></tr></thead>
            <tbody>
              {s.referrals.map((r) => (
                <tr key={r.id}>
                  <Td className="font-semibold">{s.customers.find((c) => c.id === r.referrerId)?.name}</Td>
                  <Td>{r.friend}</Td>
                  <Td className="text-mute">{fmtDateY(r.date)}</Td>
                  <Td><Pill tone={r.status === 'rewarded' ? 'ok' : r.status === 'booked' ? 'accent' : 'mute'} className="capitalize">{r.status}</Pill></Td>
                  <Td className="num text-right">{naira(r.reward)}</Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </TabsContent>
        <TabsContent value="promos" className="pt-4">
          <TableWrap>
            <thead><tr><Th>Code</Th><Th>Discount</Th><Th>Used</Th><Th>Expires</Th><Th>Status</Th></tr></thead>
            <tbody>
              {s.pricing.promos.map((p) => (
                <tr key={p.code}>
                  <Td className="num font-semibold">{p.code}</Td>
                  <Td>{Math.round(p.discount * 100)}%</Td>
                  <Td className="num">{p.uses} / {p.limit}</Td>
                  <Td className="text-mute">{fmtDateY(p.expires)}</Td>
                  <Td><Pill tone={p.active && new Date(p.expires) > new Date() ? 'ok' : 'mute'}>{p.active && new Date(p.expires) > new Date() ? 'Live' : 'Off'}</Pill></Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          <p className="mt-3 text-[13px] text-mute">Create and pause codes in <Link to="/admin/pricing" className="text-accent hover:underline">Pricing rules</Link>.</p>
        </TabsContent>
      </Tabs>
    </div>
  )
}
