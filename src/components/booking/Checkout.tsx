import { useEffect, useState } from 'react'
import { CheckCircle2, CreditCard, Hash, Landmark, Lock, XCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { brand } from '@/config/brand'
import { cn, naira } from '@/lib/utils'
import { paymentService, type PayMethod, type PaymentIntent } from '@/services/payments'
import { Button } from '@/components/ui/button'

const luhn = (n: string) => {
  let sum = 0
  let alt = false
  for (let i = n.length - 1; i >= 0; i--) {
    let d = Number(n[i])
    if (alt) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    alt = !alt
  }
  return sum % 10 === 0
}

const cardSchema = z.object({
  number: z.string().transform((v) => v.replace(/\s/g, '')).refine((v) => /^\d{16,19}$/.test(v) && luhn(v), 'Enter a valid card number.'),
  expiry: z.string().refine((v) => {
    const m = v.match(/^(\d{2})\s?\/\s?(\d{2})$/)
    if (!m) return false
    const month = Number(m[1])
    const exp = new Date(2000 + Number(m[2]), month, 1)
    return month >= 1 && month <= 12 && exp > new Date()
  }, 'Use MM/YY, in the future.'),
  cvv: z.string().regex(/^\d{3,4}$/, '3 digits on the back.'),
})
type CardForm = z.input<typeof cardSchema>

const field = 'h-12 w-full border border-ink/15 bg-white px-3.5 text-[15px] text-ink placeholder:text-ink/40 outline-none focus:border-ink aria-[invalid=true]:border-[#d23b2f]'

/** Mock Paystack-style checkout: rental + refundable deposit, card / transfer / USSD. Clearly marked as a demo. */
export function Checkout({ amount, deposit, email, onPaid }: { amount: number; deposit: number; email: string; onPaid: (method: PayMethod, ref: string) => void }) {
  const [tab, setTab] = useState<PayMethod>('card')
  const [intent, setIntent] = useState<PaymentIntent | null>(null)
  const [phase, setPhase] = useState<'form' | 'processing' | 'failed' | 'success'>('form')
  const [bank, setBank] = useState('GTBank')
  const [secs, setSecs] = useState(30 * 60)
  const total = amount + deposit

  useEffect(() => {
    paymentService.initialise(amount, deposit, tab).then(setIntent)
  }, [amount, deposit, tab])
  useEffect(() => {
    if (tab !== 'transfer') return
    const t = setInterval(() => setSecs((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [tab])

  const { register, handleSubmit, formState, setValue } = useForm<CardForm>({ resolver: zodResolver(cardSchema), defaultValues: { number: '', expiry: '', cvv: '' } })

  const finish = async (cardNumber?: string) => {
    if (!intent) return
    setPhase('processing')
    const r = await paymentService.confirm(intent, cardNumber)
    if (r.status === 'success') {
      setPhase('success')
      setTimeout(() => onPaid(tab, r.reference), 900)
    } else setPhase('failed')
  }

  return (
    <div className="mx-auto w-full max-w-md overflow-hidden bg-[#fbfaf7] text-ink shadow-[0_30px_80px_-20px_rgba(0,0,0,.8)]">
      <div className="flex items-center justify-between bg-accent px-4 py-2 text-accent-ink">
        <span className="label !text-[9.5px]">Demo checkout — no real money moves</span>
        <Lock className="size-3.5" />
      </div>
      <div className="flex items-start justify-between gap-4 border-b border-ink/10 px-6 py-5">
        <div>
          <p className="text-[13px] text-ink/60">{email || 'guest@demo'}</p>
          <p className="mt-1 text-[13px] text-ink/60">{brand.name}</p>
        </div>
        <div className="text-right">
          <p className="text-[12px] text-ink/60">Pay</p>
          <p className="num text-[22px] font-semibold">{naira(total)}</p>
          <p className="text-[11.5px] text-ink/55">{naira(amount)} rental + {naira(deposit)} deposit</p>
        </div>
      </div>

      {phase === 'success' ? (
        <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <CheckCircle2 className="size-12 text-[#1f9d55]" />
          <p className="text-[17px] font-semibold">Payment successful</p>
          <p className="text-[13px] text-ink/60">Ref {intent?.reference}</p>
        </div>
      ) : phase === 'failed' ? (
        <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <XCircle className="size-12 text-[#d23b2f]" />
          <p className="text-[17px] font-semibold">Declined by your bank</p>
          <p className="max-w-xs text-[13.5px] text-ink/65">The card was declined (demo card ending 0002). Try another card, or pay by transfer.</p>
          <button type="button" className="mt-2 h-11 bg-ink px-5 text-[14px] font-semibold text-paper" onClick={() => setPhase('form')}>
            Try again
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-[120px_1fr]">
          <nav className="flex flex-col border-r border-ink/10 py-3" aria-label="Payment method">
            {([
              ['card', 'Card', CreditCard],
              ['transfer', 'Transfer', Landmark],
              ['ussd', 'USSD', Hash],
            ] as const).map(([id, label, Icon]) => (
              <button key={id} type="button" onClick={() => setTab(id)} aria-pressed={tab === id} className={cn('flex items-center gap-2 px-4 py-3 text-left text-[13.5px] font-semibold', tab === id ? 'bg-ink/5 text-ink' : 'text-ink/55 hover:text-ink')}>
                <Icon className="size-4" /> {label}
              </button>
            ))}
          </nav>
          <div className="relative p-5">
            {phase === 'processing' && (
              <div className="absolute inset-0 z-10 grid place-items-center bg-[#fbfaf7]/90">
                <div className="flex flex-col items-center gap-3">
                  <span className="size-8 animate-spin rounded-full border-2 border-ink/15 border-t-ink" />
                  <p className="text-[13.5px] text-ink/70">Processing payment…</p>
                </div>
              </div>
            )}
            {tab === 'card' && (
              <form onSubmit={handleSubmit((v) => finish(v.number))} noValidate className="flex flex-col gap-3">
                <p className="text-[13.5px] font-semibold">Enter your card details</p>
                <div>
                  <input className={field} placeholder="0000 0000 0000 0000" inputMode="numeric" autoComplete="cc-number" aria-label="Card number" aria-invalid={!!formState.errors.number} {...register('number')} />
                  {formState.errors.number && <p className="mt-1 text-[12px] text-[#d23b2f]">{formState.errors.number.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input className={field} placeholder="MM / YY" autoComplete="cc-exp" aria-label="Expiry" aria-invalid={!!formState.errors.expiry} {...register('expiry')} />
                    {formState.errors.expiry && <p className="mt-1 text-[12px] text-[#d23b2f]">{formState.errors.expiry.message}</p>}
                  </div>
                  <div>
                    <input className={field} placeholder="CVV" inputMode="numeric" autoComplete="cc-csc" aria-label="CVV" aria-invalid={!!formState.errors.cvv} {...register('cvv')} />
                    {formState.errors.cvv && <p className="mt-1 text-[12px] text-[#d23b2f]">{formState.errors.cvv.message}</p>}
                  </div>
                </div>
                <button
                  type="button"
                  className="w-fit text-[12px] text-ink/60 underline"
                  onClick={() => {
                    setValue('number', '4084 0840 8408 4081')
                    setValue('expiry', '12/30')
                    setValue('cvv', '408')
                  }}
                >
                  Use test card 4084 0840 8408 4081
                </button>
                <button type="submit" className="mt-2 h-12 bg-[#0b9a5b] text-[15px] font-semibold text-white hover:brightness-110">
                  Pay {naira(total)}
                </button>
              </form>
            )}
            {tab === 'transfer' && intent?.transferAccount && (
              <div className="flex flex-col gap-3 text-[14px]">
                <p className="font-semibold">Transfer {naira(total)} to</p>
                <div className="border border-ink/10 bg-white p-4">
                  <p className="text-ink/60">{intent.transferAccount.bank}</p>
                  <p className="num mt-1 text-[22px] font-semibold tracking-wide">{intent.transferAccount.number}</p>
                  <p className="text-ink/60">{intent.transferAccount.name}</p>
                </div>
                <p className="text-[12.5px] text-ink/60">
                  Account expires in <span className="num font-semibold text-ink">{String(Math.floor(secs / 60)).padStart(2, '0')}:{String(secs % 60).padStart(2, '0')}</span>. Use it once, for this payment only.
                </p>
                <button type="button" onClick={() => finish()} className="h-12 bg-[#0b9a5b] text-[15px] font-semibold text-white hover:brightness-110">
                  I’ve sent the money
                </button>
              </div>
            )}
            {tab === 'ussd' && intent && (
              <div className="flex flex-col gap-3 text-[14px]">
                <label className="flex flex-col gap-1.5">
                  <span className="font-semibold">Choose your bank</span>
                  <select value={bank} onChange={(e) => setBank(e.target.value)} className={field}>
                    {['GTBank', 'Access Bank', 'Zenith Bank', 'First Bank', 'UBA', 'Kuda'].map((b) => <option key={b}>{b}</option>)}
                  </select>
                </label>
                <p className="text-ink/60">Dial this code on the phone linked to your {bank} account:</p>
                <p className="num border border-ink/10 bg-white p-4 text-center text-[22px] font-semibold">{intent.ussdCode}</p>
                <button type="button" onClick={() => finish()} className="h-12 bg-[#0b9a5b] text-[15px] font-semibold text-white hover:brightness-110">
                  I’ve completed the payment
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      <p className="flex items-center justify-center gap-1.5 border-t border-ink/10 py-3 text-[11.5px] text-ink/50">
        <Lock className="size-3" /> Secured by Paystack (simulated)
      </p>
    </div>
  )
}

export function PaymentStep({ amount, deposit, email, onPaid, back }: { amount: number; deposit: number; email: string; onPaid: (m: PayMethod, ref: string) => void; back: () => void }) {
  return (
    <div>
      <h2 className="display text-[clamp(26px,3vw,38px)] font-bold uppercase tracking-[-0.02em]">Payment</h2>
      <p className="mt-3 max-w-xl text-[15px] text-paper/75">Pay the rental plus a refundable deposit. The deposit comes back within 24 hours of a clean return.</p>
      <div className="mt-8">
        <Checkout amount={amount} deposit={deposit} email={email} onPaid={onPaid} />
      </div>
      <div className="mt-10 border-t border-line pt-6">
        <Button variant="ghost" onClick={back} roll>
          Back
        </Button>
      </div>
    </div>
  )
}
