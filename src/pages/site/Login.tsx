import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { db, setSession } from '@/lib/db'
import { latency } from '@/lib/utils'
import type { Customer } from '@/mocks/types'
import { emailService } from '@/services/email'
import { brand } from '@/config/brand'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { GridLines } from '@/components/site/Reveal'
import { cn } from '@/lib/utils'

const loginSchema = z.object({ id: z.string().trim().min(5, 'Enter your email or phone number.'), password: z.string().min(4, 'Enter your password (any 4+ characters in the demo).') })
const signupSchema = z.object({
  name: z.string().trim().min(3, 'Enter your full name.').refine((v) => v.includes(' '), 'Enter first and last name.'),
  email: z.string().trim().email('Enter a valid email address.'),
  phone: z.string().trim().regex(/^(\+?234|0)[789][01]\d{8}$/, 'Enter a Nigerian mobile number, e.g. 08031234567.'),
  password: z.string().min(6, 'Use at least 6 characters.'),
})

/** Mock customer login / signup. TODO: connect real provider — Supabase Auth (email OTP or phone OTP). */
function useTitle() {
  useEffect(() => {
    document.title = `Log in | ${brand.name}`
  }, [])
}

export default function Login() {
  useTitle()
  const [tab, setTab] = useState<'login' | 'signup'>('login')
  const navigate = useNavigate()
  const login = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) })
  const signup = useForm<z.infer<typeof signupSchema>>({ resolver: zodResolver(signupSchema) })

  const doLogin = login.handleSubmit(async (v) => {
    await latency(500, 800)
    const key = v.id.replace(/\s/g, '').toLowerCase()
    const c = db.get().customers.find((x) => x.email.toLowerCase() === key || x.phone.replace(/\s/g, '') === key || x.phone.replace(/\s/g, '').replace('+234', '0') === key)
    if (!c) {
      login.setError('id', { message: 'No account with that email or phone. Create one, or use the demo account.' })
      return
    }
    setSession({ customerId: c.id })
    toast.success(`Welcome back, ${c.name.split(' ')[0]}`)
    navigate({ to: '/account' })
  })
  const doSignup = signup.handleSubmit(async (v) => {
    await latency(600, 900)
    if (db.get().customers.some((c) => c.email.toLowerCase() === v.email.toLowerCase())) {
      signup.setError('email', { message: 'An account already uses this email. Log in instead.' })
      return
    }
    const c: Customer = {
      id: `c-${Date.now()}`, name: v.name, email: v.email, phone: v.phone, city: brand.cities[0], verification: 'none', risk: 'low', riskFlags: [], notes: [],
      joined: new Date().toISOString(), referralCode: `${v.name.split(' ')[0].toUpperCase().slice(0, 5)}${Math.floor(Math.random() * 90 + 10)}`, points: 500,
    }
    db.set((d) => {
      d.customers.unshift(c)
    })
    setSession({ customerId: c.id })
    void emailService.welcome(c.name, c.email, c.points)
    toast.success('Account created — 500 welcome points added')
    navigate({ to: '/account' })
  })

  const demo = () => {
    setSession({ customerId: 'c-1' })
    toast.success('Signed in as the demo customer')
    navigate({ to: '/account' })
  }

  return (
    <section className="relative min-h-dvh pt-32 pb-24">
      <GridLines />
      <div className="container-x relative grid gap-12 lg:grid-cols-2">
        <div>
          <h1 className="display text-[clamp(40px,6vw,88px)] font-extrabold uppercase tracking-[-0.045em]">{tab === 'login' ? 'Welcome back' : 'Create account'}</h1>
          <p className="mt-5 max-w-md text-paper/75">See your trips, extend a rental, download receipts and track your deposit. Verified once, book faster forever.</p>
        </div>
        <div className="border border-line bg-ink-2 p-6 md:p-8">
          <div className="mb-8 grid grid-cols-2 border border-line" role="tablist">
            {(['login', 'signup'] as const).map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} type="button" onClick={() => setTab(t)} className={cn('label h-11', tab === t ? 'bg-accent text-accent-ink' : 'text-mute hover:text-paper')}>
                {t === 'login' ? 'Log in' : 'Sign up'}
              </button>
            ))}
          </div>
          {tab === 'login' ? (
            <form onSubmit={doLogin} className="flex flex-col gap-5" noValidate>
              <Field label="Email or phone" htmlFor="lid" error={login.formState.errors.id?.message}>
                <Input id="lid" autoComplete="username" {...login.register('id')} aria-invalid={!!login.formState.errors.id} />
              </Field>
              <Field label="Password" htmlFor="lpw" error={login.formState.errors.password?.message}>
                <Input id="lpw" type="password" autoComplete="current-password" {...login.register('password')} aria-invalid={!!login.formState.errors.password} />
              </Field>
              <Button type="submit" size="lg" roll loading={login.formState.isSubmitting}>
                Log in
              </Button>
              <button type="button" onClick={demo} className="label text-accent hover:underline">
                Use the demo customer account
              </button>
            </form>
          ) : (
            <form onSubmit={doSignup} className="flex flex-col gap-5" noValidate>
              {(['name', 'email', 'phone', 'password'] as const).map((f) => (
                <Field key={f} label={{ name: 'Full name', email: 'Email', phone: 'Phone (WhatsApp)', password: 'Password' }[f]} htmlFor={`s-${f}`} error={signup.formState.errors[f]?.message}>
                  <Input id={`s-${f}`} type={f === 'password' ? 'password' : f === 'email' ? 'email' : f === 'phone' ? 'tel' : 'text'} {...signup.register(f)} aria-invalid={!!signup.formState.errors[f]} />
                </Field>
              ))}
              <Button type="submit" size="lg" roll loading={signup.formState.isSubmitting}>
                Create account
              </Button>
              <p className="text-[13px] text-mute">
                By signing up you agree to our <Link to="/terms" className="underline">terms</Link> and <Link to="/privacy" className="underline">privacy policy</Link>.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
