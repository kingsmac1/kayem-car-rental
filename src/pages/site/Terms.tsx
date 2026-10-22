import { brand } from '@/config/brand'
import { LegalPage } from './Legal'

export default function Terms() {
  return (
    <LegalPage
      title="Rental terms"
      intro="The short version: be verified, bring it back on time and full, and tell us straight away if anything goes wrong."
      sections={[
        ['Who can rent', 'Self-drive renters must be 23 or older, hold a full licence for at least 2 years, and pass identity verification (NIN or passport, licence and live selfie). Chauffeur bookings need identity verification only.'],
        ['Bookings and payment', 'A booking is confirmed once payment and the refundable deposit are received and identity checks pass. Prices include VAT where applicable. Promo codes cannot be combined.'],
        ['Deposits', 'Deposits are held during the rental and refunded within 24 hours of a clean return. Deductions for damage, fuel, late return, cleaning or fines are itemised with before-and-after photos.'],
        ['Fuel and mileage', 'Full-to-full fuel. Unlimited mileage within the city; interstate trips need an interstate permit on the booking.'],
        ['Use of the car', 'No ride-hailing, racing, off-roading (except in 4WD cars on suitable roads), towing, smoking, or carrying illegal goods. Only verified drivers named on the booking may drive.'],
        ['Tracking', 'All cars have GPS tracking for safety and recovery. If a car leaves its approved area without permission or is reported stolen, it may be remotely immobilised once stationary.'],
        ['Accidents, breakdowns and theft', `Report immediately on ${brand.contact.phoneDisplay} (WhatsApp or call). Do not arrange private repairs. Mechanical failures not caused by misuse are our responsibility.`],
        ['Cancellations', 'Free cancellation up to 24 hours before pick-up; within 24 hours one day’s rental is kept. No-shows are charged one day. Deposits are always refunded in full on cancellation.'],
        ['Liability', 'Comprehensive insurance is included. Renters are liable for the insurance excess, and in full for damage caused by negligence, intoxication or breach of these terms.'],
        ['Governing law', 'These terms are governed by the laws of the Federal Republic of Nigeria. Disputes go first to mediation in Lagos.'],
      ]}
    />
  )
}
