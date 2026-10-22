import type { City } from '@/config/brand'

export type CarCategory = 'Saloon' | 'SUV' | 'Luxury Saloon' | 'Luxury SUV' | 'Van' | 'Bus'
export type DriveMode = 'self-drive' | 'chauffeur'
export type CarStatus = 'available' | 'rented' | 'maintenance' | 'blocked'
export type DocType = 'Vehicle licence' | 'Insurance' | 'Roadworthiness' | 'Proof of ownership'

export interface CarDocument {
  type: DocType
  number: string
  expires: string
}

export interface Car {
  id: string
  make: string
  model: string
  year: number
  category: CarCategory
  city: City
  seats: number
  transmission: 'Automatic' | 'Manual'
  fuel: 'Petrol' | 'Diesel' | 'Hybrid'
  colour: string
  plate: string
  image: string
  gallery: string[]
  rates: { hourly: number; daily: number; weekly: number; monthly: number }
  deposit: number
  modes: DriveMode[]
  status: CarStatus
  blockedReason?: string
  mileage: number
  serviceEveryKm: number
  lastServiceKm: number
  fuelLevel: number
  owner: 'company' | string // partner id
  features: string[]
  documents: CarDocument[]
  tagline: string
  featured?: boolean
}

export type VerificationStatus = 'verified' | 'review' | 'failed' | 'none'
export type RiskLevel = 'low' | 'medium' | 'high'

export interface Customer {
  id: string
  name: string
  phone: string
  email: string
  city: City
  verification: VerificationStatus
  verificationDetail?: { nin: 'match' | 'mismatch' | 'pending'; licence: 'valid' | 'expired' | 'pending'; selfie: number }
  risk: RiskLevel
  riskFlags: string[]
  blacklist?: { reason: string; date: string; by: string }
  notes: string[]
  corporateId?: string
  joined: string
  referralCode: string
  points: number
}

export type BookingStatus = 'pending' | 'confirmed' | 'active' | 'returned' | 'closed' | 'cancelled'
export type DepositStatus = 'pending' | 'held' | 'refunded' | 'deducted'
export type Channel = 'website' | 'whatsapp' | 'walk-in' | 'corporate' | 'phone'

export interface Deduction {
  label: string
  amount: number
  kind: 'damage' | 'fuel' | 'late' | 'fine' | 'cleaning'
  photo?: string
}

export interface Booking {
  id: string
  ref: string
  carId: string
  customerId: string
  start: string
  end: string
  pickup: string
  dropoff: string
  mode: DriveMode
  chauffeurId?: string
  extras: string[]
  status: BookingStatus
  total: number
  paid: number
  deposit: number
  depositStatus: DepositStatus
  deductions: Deduction[]
  channel: Channel
  createdAt: string
  corporateId?: string
  extendedDays?: number
  promo?: string
  rating?: number
}

export interface Location {
  id: string
  city: City
  name: string
  kind: 'airport' | 'office' | 'hotel' | 'area'
  lat: number
  lng: number
}

export interface Chauffeur {
  id: string
  name: string
  phone: string
  city: City
  rating: number
  trips: number
  available: boolean
  languages: string[]
  years: number
  licenceExpiry: string
  payoutPending: number
  earningsMonth: number
}

export interface CorporateAccount {
  id: string
  name: string
  kind: 'Company' | 'Embassy' | 'Hotel' | 'Event planner'
  city: City
  contact: string
  email: string
  creditLimit: number
  balance: number
  discount: number
  bookers: { name: string; email: string; role: string }[]
  since: string
}

export interface PartnerOwner {
  id: string
  name: string
  phone: string
  email: string
  city: City
  commission: number
  status: 'approved' | 'pending' | 'paused'
  joined: string
  payoutPending: number
  paidOut: number
  pendingCar?: { make: string; model: string; year: number }
}

export interface MaintenanceRecord {
  id: string
  carId: string
  date: string
  kind: 'Service' | 'Repair' | 'Tyres' | 'Body work' | 'Inspection'
  description: string
  km: number
  cost: number
  vendor: string
}

export interface ChatMessage {
  id: string
  from: 'customer' | 'bot' | 'agent'
  text: string
  at: string
  card?: ChatCard
}

export type ChatCard =
  | { kind: 'cars'; carIds: string[] }
  | { kind: 'quote'; carId: string; days: number; total: number; deposit: number }
  | { kind: 'payment'; ref: string; amount: number }
  | { kind: 'confirmed'; ref: string; carId: string; start: string; pickup: string }
  | { kind: 'handover' }

export interface Conversation {
  id: string
  customerName: string
  phone: string
  status: 'bot' | 'needs-human' | 'human' | 'closed'
  topic: string
  unread: number
  messages: ChatMessage[]
  updatedAt: string
}

export interface SeasonRule {
  id: string
  name: string
  from: string
  to: string
  uplift: number
  active: boolean
}
export interface PromoCode {
  code: string
  discount: number
  uses: number
  limit: number
  expires: string
  active: boolean
}

export interface PricingRules {
  seasons: SeasonRule[]
  weekendUplift: number
  eventUplift: number
  sameDayPremium: number
  longStay: { minDays: number; discount: number }[]
  corporateDiscount: number
  loyaltyDiscount: number
  promos: PromoCode[]
}

export interface AuditEntry {
  id: string
  at: string
  actor: string
  role: StaffRole
  action: string
}

export type StaffRole = 'Owner' | 'Manager' | 'Front Desk' | 'Fleet Officer'

export interface Staff {
  id: string
  name: string
  role: StaffRole
  email: string
  active: boolean
}

export interface Alert {
  id: string
  at: string
  level: 'info' | 'warn' | 'bad'
  kind: 'overspeed' | 'geofence' | 'harsh' | 'night' | 'overdue' | 'document' | 'service' | 'payment' | 'verification'
  carId?: string
  bookingId?: string
  text: string
  read: boolean
}

export interface Review {
  id: string
  bookingId: string
  customerId: string
  rating: number
  text: string
  requested: string
  status: 'requested' | 'reviewed' | 'not-sent'
}

export interface Referral {
  id: string
  referrerId: string
  friend: string
  date: string
  status: 'signed-up' | 'booked' | 'rewarded'
  reward: number
}

export interface Inspection {
  id: string
  bookingId: string
  carId: string
  kind: 'check-out' | 'check-in'
  at: string
  by: string
  mileage: number
  fuel: number
  photos: Record<string, string>
  damages: { angle: string; x: number; y: number; label: string; severity: 'minor' | 'moderate' | 'major'; cost: number; ai: boolean }[]
  notes: string
}

export interface Settings {
  depositRule: string
  fuelPolicy: string
  lateFeePerHour: number
  graceMinutes: number
  minAge: number
  cancellationHours: number
}

export interface DemoState {
  version: number
  savedOn: string
  cars: Car[]
  customers: Customer[]
  bookings: Booking[]
  chauffeurs: Chauffeur[]
  corporates: CorporateAccount[]
  partners: PartnerOwner[]
  maintenance: MaintenanceRecord[]
  conversations: Conversation[]
  pricing: PricingRules
  audit: AuditEntry[]
  staff: Staff[]
  alerts: Alert[]
  reviews: Review[]
  referrals: Referral[]
  inspections: Inspection[]
  settings: Settings
}
