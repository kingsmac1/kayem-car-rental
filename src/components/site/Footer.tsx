import { Link } from '@tanstack/react-router'
import { brand } from '@/config/brand'
import { waLink } from '@/lib/utils'
import { RollText } from '@/components/ui/button'
import { Logo } from './Logo'
import { SocialIcons } from './SocialIcons'
import { GridLines } from './Reveal'

const cols = [
  {
    title: 'Rent',
    links: [
      { to: '/fleet', label: 'Browse the fleet' },
      { to: '/book', label: 'Book a car' },
      { to: '/fleet', search: { mode: 'chauffeur' }, label: 'Chauffeur hire' },
      { to: '/account', label: 'My trips' },
    ],
  },
  {
    title: 'Company',
    links: [
      { to: '/about', label: 'About' },
      { to: '/business', label: 'Corporate accounts' },
      { to: '/earn', label: 'Earn with your car' },
      { to: '/contact', label: 'Contact' },
    ],
  },
  {
    title: 'Help',
    links: [
      { to: '/faq', label: 'FAQ' },
      { to: '/terms', label: 'Rental terms' },
      { to: '/privacy', label: 'Privacy' },
    ],
  },
] as const

export function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="relative overflow-hidden border-t border-line bg-ink">
      <GridLines />
      <div className="container-x relative pt-20 pb-10">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-6 max-w-xs text-[15px] text-mute">{brand.description}</p>
            <div className="mt-8 flex flex-col gap-2 text-[15px]">
              <a className="w-fit hover:text-accent" href={`tel:${brand.contact.phoneTel}`}>{brand.contact.phoneDisplay}</a>
              <a className="w-fit hover:text-accent" href={waLink('Hi, I’d like to book a car')} target="_blank" rel="noreferrer">WhatsApp 24/7</a>
              <a className="w-fit hover:text-accent" href={`mailto:${brand.contact.email}`}>{brand.contact.email}</a>
              <p className="text-mute">{brand.contact.address}</p>
            </div>
          </div>
          {cols.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <p className="label text-mute">{c.title}</p>
              <ul className="mt-5 flex flex-col gap-3">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} search={'search' in l ? l.search : undefined} className="roll-host text-[15px] hover:text-accent">
                      <RollText>{l.label}</RollText>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <p className="display mt-20 select-none text-[clamp(56px,15.5vw,236px)] font-extrabold leading-[0.8] tracking-[-0.05em] text-paper/[0.06]" aria-hidden>
          {brand.logoText}
        </p>
        <div className="mt-8 flex flex-col gap-4 border-t border-line pt-6 text-[13px] text-mute md:flex-row md:items-center md:justify-between">
          <p>© {year} {brand.name}. Serving {brand.cities.join(', ')}.</p>
          <SocialIcons className="-ml-2 text-paper/80" />
        </div>
      </div>
    </footer>
  )
}
