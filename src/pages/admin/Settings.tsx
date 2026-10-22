import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { brand } from '@/config/brand'
import { audit, db, resetDemo, useDb } from '@/lib/db'
import { ROLES, ROLE_INFO } from '@/lib/roles'
import { fmtDateY, fmtTime, naira, timeAgo } from '@/lib/utils'
import type { Settings as S, StaffRole } from '@/mocks/types'
import { AdminTitle, TableWrap, Td, Th } from '@/components/admin/kit'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { AppField, Input, Select, Textarea } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Avatar, Panel, Pill } from '@/components/ui/misc'

export default function Settings() {
  const s = useDb((x) => x)
  const [policy, setPolicy] = useState<S>(s.settings)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<StaffRole>('Front Desk')

  return (
    <div>
      <AdminTitle title="Settings" />
      <Tabs defaultValue="brand">
        <TabsList>
          <TabsTrigger value="brand">Brand</TabsTrigger>
          <TabsTrigger value="staff">Staff & roles</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="audit">Audit log</TabsTrigger>
        </TabsList>

        <TabsContent value="brand" className="pt-5">
          <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
            <Panel title="Brand preview">
              <div className="border border-line bg-ink p-5">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-10 place-items-center bg-accent font-display text-[20px] font-extrabold text-accent-ink">{brand.monogram}</span>
                  <span className="font-display text-[18px] font-bold tracking-[0.08em]">{brand.logoText}</span>
                </div>
                <p className="display mt-6 text-[34px] font-extrabold uppercase">{brand.tagline}</p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {Object.entries(brand.colors).map(([k, v]) => (
                    <span key={k} className="flex items-center gap-2 border border-line px-2 py-1 text-[12px]"><span className="size-4 border border-line" style={{ background: v }} />{k} <span className="num text-mute">{v}</span></span>
                  ))}
                </div>
                <p className="mt-4 text-[12.5px] text-mute">Fonts: {brand.fonts.display} (headlines), {brand.fonts.label} (labels), {brand.fonts.body} (body), {brand.fonts.mono} (numbers)</p>
              </div>
            </Panel>
            <Panel title="Business details">
              <dl className="grid gap-3 text-[13.5px] sm:grid-cols-2">
                {[
                  ['Company', brand.name], ['Short name', brand.shortName], ['Phone', brand.contact.phoneDisplay], ['WhatsApp', `wa.me/${brand.contact.whatsapp}`],
                  ['Email', brand.contact.email], ['Address', brand.contact.address], ['Cities', brand.cities.join(', ')], ['Currency', `${brand.currency.code} (${brand.currency.symbol})`],
                ].map(([k, v]) => <div key={k} className="border-b border-line pb-2"><dt className="text-[12px] text-mute">{k}</dt><dd className="font-semibold">{v}</dd></div>)}
              </dl>
              <p className="mt-4 border border-accent/30 bg-accent/5 p-3 text-[13px]">To rebrand for a new client, edit <span className="num text-accent">src/config/brand.ts</span> — every page, colour, meta tag and the favicon update from that one file. See the README.</p>
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="staff" className="pt-5">
          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <TableWrap>
              <thead><tr><Th>Staff</Th><Th>Role</Th><Th>Active</Th></tr></thead>
              <tbody>
                {s.staff.map((m, i) => (
                  <tr key={m.id}>
                    <Td><span className="flex items-center gap-2.5"><Avatar name={m.name} /><span><span className="font-semibold">{m.name}</span><span className="block text-[12px] text-mute">{m.email}</span></span></span></Td>
                    <Td>
                      <Select compact value={m.role} onChange={(e) => { db.set((d) => { d.staff[i].role = e.target.value as StaffRole }); audit(`Changed ${m.name}'s role to ${e.target.value}`); toast.success('Role updated') }} className="w-40" aria-label={`${m.name} role`} disabled={m.role === 'Owner' && s.staff.filter((x) => x.role === 'Owner').length === 1}>
                        {ROLES.map((r) => <option key={r}>{r}</option>)}
                      </Select>
                    </Td>
                    <Td><Switch checked={m.active} onCheckedChange={(v) => { db.set((d) => { d.staff[i].active = v }); audit(`${v ? 'Re-activated' : 'Deactivated'} ${m.name}`) }} aria-label={`${m.name} active`} disabled={m.role === 'Owner'} /></Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
            <div className="flex flex-col gap-6">
              <Panel title="Invite staff">
                <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); if (!name || !/\S+@\S+\.\S+/.test(email)) { toast.error('Enter a name and a valid email'); return } db.set((d) => { d.staff.push({ id: `s-${Date.now()}`, name, email, role, active: true }) }); audit(`Invited ${name} as ${role}`); toast.success(`Invite sent to ${email}`); setName(''); setEmail('') }}>
                  <AppField label="Name" htmlFor="st-n"><Input compact id="st-n" value={name} onChange={(e) => setName(e.target.value)} /></AppField>
                  <AppField label="Email" htmlFor="st-e"><Input compact id="st-e" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></AppField>
                  <AppField label="Role" htmlFor="st-r"><Select compact id="st-r" value={role} onChange={(e) => setRole(e.target.value as StaffRole)}>{ROLES.map((r) => <option key={r}>{r}</option>)}</Select></AppField>
                  <Button type="submit" size="app" icon={<Plus className="size-4" />}>Send invite</Button>
                </form>
              </Panel>
              <Panel title="What each role can do">
                <ul className="flex flex-col gap-2 text-[13px]">{ROLES.map((r) => <li key={r}><span className="font-semibold">{r}:</span> <span className="text-mute">{ROLE_INFO[r]}</span></li>)}</ul>
              </Panel>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="policies" className="pt-5">
          <Panel title="Rental policies">
            <form className="grid gap-4 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); db.set((d) => { d.settings = policy }); audit('Updated rental policies'); toast.success('Policies saved — the rental agreement now uses them') }}>
              <AppField label="Deposit rule" htmlFor="p-dep" className="md:col-span-2"><Textarea id="p-dep" value={policy.depositRule} onChange={(e) => setPolicy({ ...policy, depositRule: e.target.value })} className="min-h-20 text-sm" /></AppField>
              <AppField label="Fuel policy" htmlFor="p-fuel" className="md:col-span-2"><Textarea id="p-fuel" value={policy.fuelPolicy} onChange={(e) => setPolicy({ ...policy, fuelPolicy: e.target.value })} className="min-h-16 text-sm" /></AppField>
              <AppField label={`Late fee per hour (now ${naira(policy.lateFeePerHour)})`} htmlFor="p-late"><Input compact id="p-late" type="number" value={policy.lateFeePerHour} onChange={(e) => setPolicy({ ...policy, lateFeePerHour: Number(e.target.value) })} /></AppField>
              <AppField label="Grace period (minutes)" htmlFor="p-grace"><Input compact id="p-grace" type="number" value={policy.graceMinutes} onChange={(e) => setPolicy({ ...policy, graceMinutes: Number(e.target.value) })} /></AppField>
              <AppField label="Minimum driver age" htmlFor="p-age"><Input compact id="p-age" type="number" value={policy.minAge} onChange={(e) => setPolicy({ ...policy, minAge: Number(e.target.value) })} /></AppField>
              <AppField label="Free cancellation (hours before)" htmlFor="p-can"><Input compact id="p-can" type="number" value={policy.cancellationHours} onChange={(e) => setPolicy({ ...policy, cancellationHours: Number(e.target.value) })} /></AppField>
              <div className="md:col-span-2"><Button type="submit" size="app">Save policies</Button></div>
            </form>
          </Panel>
          <Panel title="Demo data" className="mt-6">
            <p className="text-[13.5px] text-mute">Bookings, edits and new records from demos are saved in this browser. Reset to start a fresh pitch.</p>
            <Button size="app" variant="danger" className="mt-3" onClick={() => { if (confirm('Reset all demo data? Changes made in this browser will be lost.')) { resetDemo(); toast.success('Demo data reset'); window.location.assign('/admin/login') } }}>Reset demo data</Button>
          </Panel>
        </TabsContent>

        <TabsContent value="audit" className="pt-5">
          <TableWrap>
            <thead><tr><Th>When</Th><Th>Staff</Th><Th>Role</Th><Th>Action</Th></tr></thead>
            <tbody>
              {s.audit.slice(0, 120).map((a) => (
                <tr key={a.id}>
                  <Td className="whitespace-nowrap text-mute">{fmtDateY(a.at)} {fmtTime(a.at)}<span className="block text-[11.5px]">{timeAgo(a.at)}</span></Td>
                  <Td className="font-semibold">{a.actor}</Td>
                  <Td><Pill tone="mute">{a.role}</Pill></Td>
                  <Td>{a.action}</Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </TabsContent>
      </Tabs>
    </div>
  )
}
