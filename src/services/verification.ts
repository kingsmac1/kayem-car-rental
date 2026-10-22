/**
 * Identity verification — NIN, driver's licence and live selfie match.
 * TODO: connect real provider — call Dojah (or Smile ID / Prembly) from a Supabase
 * Edge Function so API keys never reach the browser. Store only the result and a
 * provider reference, never the raw NIN or selfie image.
 *
 * Demo behaviour (simulated, nothing is stored or logged):
 * - NIN ending in 0 → "failed", ending in 9 → "needs review", anything else → verified.
 * - Licence: any image passes; a file named with "expired" fails.
 * - Selfie: random score 86–98 (pass); camera-less uploads score lower (needs review).
 */
import { sleep } from '@/lib/utils'

export type CheckResult = 'verified' | 'failed' | 'review'

export interface NinResult { status: CheckResult; message: string; name?: string }
export interface LicenceResult { status: CheckResult; message: string; expires?: string }
export interface SelfieResult { status: CheckResult; score: number; message: string }

const VERIFIED_KEY = 'rentalos:verified'

export const verificationService = {
  async verifyNIN(nin: string): Promise<NinResult> {
    await sleep(1400)
    const digits = nin.replace(/\D/g, '')
    if (digits.length !== 11) return { status: 'failed', message: 'A NIN has exactly 11 digits.' }
    const last = digits.at(-1)
    if (last === '0') return { status: 'failed', message: 'This NIN does not match the name on your booking.' }
    if (last === '9') return { status: 'review', message: 'NIMC is slow to respond. A team member will confirm within 15 minutes.' }
    return { status: 'verified', message: 'NIN matched with NIMC records.' }
  },

  async verifyLicence(file: File | null): Promise<LicenceResult> {
    await sleep(1600)
    if (!file) return { status: 'failed', message: 'Upload a clear photo of the front of your licence.' }
    if (/expired/i.test(file.name)) return { status: 'failed', message: 'This licence has expired. Renew it with FRSC or add another driver.' }
    const exp = new Date()
    exp.setFullYear(exp.getFullYear() + 2)
    return { status: 'verified', message: 'Licence is valid (FRSC format check passed).', expires: exp.toISOString() }
  },

  async verifySelfie(source: 'camera' | 'upload'): Promise<SelfieResult> {
    await sleep(2200)
    const score = source === 'camera' ? 86 + Math.round(Math.random() * 12) : 68 + Math.round(Math.random() * 10)
    if (score >= 80) return { status: 'verified', score, message: `Face matches your licence photo (${score}%).` }
    return { status: 'review', score, message: `Match score ${score}% — a team member will review it before pickup.` }
  },

  /** Returning verified customers skip the verification step. */
  rememberVerified(customerKey: string) {
    try {
      const set = new Set<string>(JSON.parse(localStorage.getItem(VERIFIED_KEY) ?? '[]'))
      set.add(customerKey.toLowerCase())
      localStorage.setItem(VERIFIED_KEY, JSON.stringify([...set]))
    } catch {
      /* ignore */
    }
  },
  isKnownVerified(customerKey: string) {
    try {
      return (JSON.parse(localStorage.getItem(VERIFIED_KEY) ?? '[]') as string[]).includes(customerKey.toLowerCase())
    } catch {
      return false
    }
  },
}
