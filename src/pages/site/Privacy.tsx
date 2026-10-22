import { brand } from '@/config/brand'
import { LegalPage } from './Legal'

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy"
      intro="We collect what we need to keep you, our cars and our partners safe — and nothing we don’t."
      sections={[
        ['What we collect', 'Your name, phone, email, booking history and payment references. For verification, a licensed provider checks your NIN, licence and selfie; we store only the result and a reference number, never the raw NIN or images.'],
        ['Vehicle data', 'Cars report GPS location, speed and driving events during rentals. This is used for safety, recovery, damage disputes and fines, and kept for 12 months.'],
        ['Payments', 'Card details are entered directly with our payment provider (e.g. Paystack). We never see or store your full card number.'],
        ['How we use it', 'To confirm bookings, prevent fraud, send reminders and receipts, handle support, and improve our service. With your permission, to send offers. You can opt out any time.'],
        ['Sharing', 'With insurers, payment and verification providers, and law enforcement when legally required. We never sell your data.'],
        ['Your rights (NDPA 2023)', `You can ask for a copy of your data, correct it, or ask us to delete it where the law allows. Email ${brand.contact.email}.`],
        ['Security', 'Data is encrypted in transit and at rest, access is restricted by staff role, and every staff action is logged.'],
      ]}
    />
  )
}
