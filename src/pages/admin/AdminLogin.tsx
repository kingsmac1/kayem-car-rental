import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { brand } from '@/config/brand'
import { db, setSession } from '@/lib/db'
import { ROLES, ROLE_INFO } from '@/lib/roles'
import { cn, latency } from '@/lib/utils'
import type { StaffRole } from '@/mocks/types'
import { Button } from '@/components/ui/button'
import { AppField, Input } from '@/components/ui/input'

/** Mock staff login. TODO: connect real provider — Supabase Auth + a `staff` table with role claims. */
export default function AdminLogin() {
  const navigate = useNavigate()
  const [role, setRole] = useState<StaffRole>('Owner')
  const [email, setEmail] = useState<string>(brand.demoOwner.email)
  const [pw, setPw] = useState('demo1234')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pw.length < 4) {
      setError('Enter your password (any 4+ characters in the demo).')
      return
    }
    setLoading(true)
    await latency(500, 800)
    const staff = db.get().staff.find((s) => s.role === role)!
    setSession({ staff: { name: staff.name, role } })
    navigate({ to: '/admin' })
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-ink px-4 py-10 font-body text-paper">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid size-10 place-items-center bg-accent font-display text-[20px] font-extrabold text-accent-ink">{brand.monogram}</span>
          <div>
            <p className="font-bold">{brand.shortName} Rental OS</p>
            <p className="text-[13px] text-mute">Staff sign-in</p>
          </div>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-4 border border-line bg-ink-2 p-6">
          <AppField label="Email" htmlFor="ae"><Input compact id="ae" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" /></AppField>
          <AppField label="Password" htmlFor="ap" error={error}><Input compact id="ap" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" /></AppField>
          <fieldset>
            <legend className="mb-2 text-xs font-semibold text-mute">Sign in as (demo)</legend>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map((r) => (
                <button key={r} type="button" onClick={() => { setRole(r); setEmail(db.get().staff.find((s) => s.role === r)!.email) }} aria-pressed={role === r} className={cn('rounded-[2px] border px-3 py-2 text-left text-[13px] font-semibold', role === r ? 'border-accent bg-accent/10 text-accent' : 'border-line hover:border-line-strong')}>
                  {r}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[12.5px] text-mute">{ROLE_INFO[role]}</p>
          </fieldset>
          <Button type="submit" size="app" loading={loading} className="mt-2 h-10">Sign in</Button>
        </form>
      </div>
    </main>
  )
}
