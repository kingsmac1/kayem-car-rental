import { faqs } from '@/data/content'
import { PageHeader } from '@/components/site/PageHeader'
import { FaqList } from '@/components/site/home/Closing'
import { brand } from '@/config/brand'
import { waLink } from '@/lib/utils'

const more = [
  { q: 'Is fuel included?', a: 'Cars are handed over full and should come back full. Missing fuel is charged at pump price plus a small service fee, with a dashboard photo as evidence.' },
  { q: 'Can someone else drive?', a: 'Yes — add “Extra driver” at booking. They also complete a quick verification.' },
  { q: 'Do you deliver the car to me?', a: 'Yes, to any address, hotel or airport in our cities. Delivery inside the city is free for bookings of 3+ days.' },
  { q: 'What if I return late?', a: 'There is a 59-minute grace period, then an hourly late fee. Need longer? Extend from your account or WhatsApp — it’s cheaper than a late fee.' },
]

export default function Faq() {
  return (
    <>
      <PageHeader title="Questions & answers" intro={<>Can’t find it here? <a className="text-accent underline" href={waLink('Hi, I have a question')} target="_blank" rel="noreferrer">Ask on WhatsApp</a> or call {brand.contact.phoneDisplay}.</>} />
      <section className="container-x max-w-4xl py-16">
        <FaqList items={[...faqs, ...more]} />
      </section>
    </>
  )
}
