import type { DriveMode } from '@/mocks/types'
import type { CheckResult } from '@/services/verification'

export interface Draft {
  carId?: string
  city: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  pickup: string
  dropoff: string
  flight: string
  mode: DriveMode
  extras: string[]
  promo: string
  // contact
  name: string
  phone: string
  email: string
  // verification results (never the raw NIN or selfie)
  nin?: CheckResult
  licence?: CheckResult
  selfie?: CheckResult
  selfieScore?: number
  skipVerification?: boolean
  // agreement
  signature?: string
  agreed?: boolean
  // result
  bookingId?: string
  bookingRef?: string
  paidWith?: string
}

export const STEPS = ['Trip', 'Drive & extras', 'Verify', 'Agreement', 'Payment', 'Done'] as const

export function startOf(d: Draft) {
  return new Date(`${d.startDate}T${d.startTime}:00`)
}
export function endOf(d: Draft) {
  return new Date(`${d.endDate}T${d.endTime}:00`)
}
