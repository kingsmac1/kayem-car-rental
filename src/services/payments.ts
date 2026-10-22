import { brand } from '@/config/brand'
/**
 * Payments — rental charge plus refundable deposit.
 * TODO: connect real provider — initialise transactions with Paystack
 * (POST /transaction/initialize) or Flutterwave from a Supabase Edge Function,
 * verify via webhook, and use Paystack "preauthorization" (or a held transfer)
 * for deposits. Card details must only ever be entered in the provider's checkout.
 */
import { audit, db } from '@/lib/db'
import { sleep } from '@/lib/utils'

export type PayMethod = 'card' | 'transfer' | 'ussd'

export interface PaymentIntent {
  reference: string
  amount: number
  deposit: number
  method: PayMethod
  status: 'pending' | 'success' | 'failed'
  transferAccount?: { bank: string; number: string; name: string; expiresInMin: number }
  ussdCode?: string
}

export const paymentService = {
  async initialise(amount: number, deposit: number, method: PayMethod): Promise<PaymentIntent> {
    await sleep(700)
    const reference = `PSK_${Date.now().toString(36).toUpperCase()}`
    return {
      reference,
      amount,
      deposit,
      method,
      status: 'pending',
      transferAccount: method === 'transfer' ? { bank: 'Wema Bank (demo)', number: `78${String(Date.now()).slice(-8)}`, name: `${brand.shortName} Checkout`, expiresInMin: 30 } : undefined,
      ussdCode: method === 'ussd' ? `*737*000*${String(amount + deposit).slice(0, 6)}#` : undefined,
    }
  },

  /** Simulates the provider confirming payment. Card number ending 0002 fails (demo). */
  async confirm(intent: PaymentIntent, cardNumber?: string): Promise<PaymentIntent> {
    await sleep(1800)
    if (cardNumber && cardNumber.replace(/\s/g, '').endsWith('0002')) return { ...intent, status: 'failed' }
    return { ...intent, status: 'success' }
  },

  async holdDeposit(bookingId: string) {
    await sleep(500)
    db.set((d) => {
      const b = d.bookings.find((x) => x.id === bookingId)
      if (b) b.depositStatus = 'held'
    })
  },

  async refundDeposit(bookingId: string) {
    await sleep(800)
    const b = db.get().bookings.find((x) => x.id === bookingId)
    db.set((d) => {
      const x = d.bookings.find((y) => y.id === bookingId)
      if (x) x.depositStatus = 'refunded'
    })
    if (b) audit(`Refunded deposit for ${b.ref}`)
  },

  async deductDeposit(bookingId: string, deductions: { label: string; amount: number; kind: 'damage' | 'fuel' | 'late' | 'fine' | 'cleaning'; photo?: string }[]) {
    await sleep(900)
    const b = db.get().bookings.find((x) => x.id === bookingId)
    db.set((d) => {
      const x = d.bookings.find((y) => y.id === bookingId)
      if (x) {
        x.deductions = deductions
        x.depositStatus = deductions.length ? 'deducted' : 'refunded'
      }
    })
    if (b) audit(`Deducted ₦${deductions.reduce((s, x) => s + x.amount, 0).toLocaleString()} from deposit for ${b.ref}`)
  },
}
