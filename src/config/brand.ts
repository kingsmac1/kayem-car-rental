/**
 * BRAND CONFIG — the only file you edit to rebrand Rental OS for a new client.
 *
 * Everything visible (name, logo text, colours, fonts, contact details, cities,
 * currency, social links, SEO text) is read from here. Colours are pushed into
 * CSS variables at startup (see src/lib/theme.ts), so Tailwind classes such as
 * `bg-accent` or `text-paper` follow whatever you set below.
 */

export const brand = {
  /** Full trading name, used in titles, legal pages and receipts. */
  name: 'Kayem Car Rental',
  /** Short name for tight spaces (nav, chat headers, receipts). */
  shortName: 'Kayem',
  /** Wordmark text shown in the header logo. */
  logoText: 'KAYEM',
  /** Single letter used where the drawn mark can't be (fallback text, screen readers). */
  monogram: 'K',
  /**
   * The logo mark: SVG path(s) drawn on a 32×32 grid, filled with the accent-ink colour
   * on an accent tile. Used by the header logo, favicon, loader, admin and portals.
   * Replace with a client's own mark (keep the 32×32 viewBox), or set to '' to fall back to `monogram`.
   * Default: a forward-leaning "K" with a split upper arm, like a chequered-flag cut.
   */
  logoMarkPath:
    'M9.2 6h4.6l-3.4 20H5.8z M14.6 15.2L22.4 6h5.4l-8.1 9.2z M16.2 17.4h5.2l4.3 8.6h-5.3z',
  /** Short lowercase handle for demo domains (pay.<slug>.demo) and emails. */
  slug: 'kayem',
  /** Booking reference prefix, e.g. KYM-4123. */
  refPrefix: 'KYM',
  tagline: 'Premium cars. Zero hassle.',
  description:
    'Self-drive and chauffeur car hire in Lagos, Abuja and Port Harcourt. Verified customers, tracked cars, transparent deposits and 24/7 WhatsApp booking.',

  contact: {
    phoneDisplay: '+234 902 798 9060',
    phoneTel: '+2349027989060',
    /** Digits only, international format, no plus sign. */
    whatsapp: '2349027989060',
    email: 'emkaydigitals@gmail.com',
    address: '14 Admiralty Way, Lekki Phase 1, Lagos',
    hours: 'Open 24/7 on WhatsApp · Office 8am–8pm',
  },

  cities: ['Lagos', 'Abuja', 'Port Harcourt'] as const,

  currency: {
    code: 'NGN',
    symbol: '₦',
    locale: 'en-NG',
  },

  social: {
    instagram: 'https://instagram.com/',
    x: 'https://x.com/',
    facebook: 'https://facebook.com/',
    linkedin: 'https://linkedin.com/',
    tiktok: 'https://tiktok.com/',
  },

  /** Hero stats (number board). */
  stats: [
    { value: 120, suffix: '+', label: 'Cars' },
    { value: 3, suffix: '', label: 'Cities' },
    { value: 10000, suffix: '+', label: 'Trips' },
    { value: 24, suffix: '/7', label: 'Support' },
  ],

  colors: {
    ink: '#0A0A09',
    ink2: '#121211',
    ink3: '#1B1B19',
    paper: '#F2EFE8',
    mute: '#9C988E',
    accent: '#FFD400',
    accentInk: '#0A0A09',
    ok: '#5BD08A',
    warn: '#FFB020',
    bad: '#FF5A4E',
  },

  fonts: {
    display: 'Unbounded',
    label: 'Michroma',
    body: 'Manrope',
    mono: 'Geist Mono',
    /** Google Fonts CSS2 query — load only the weights in use. */
    googleHref:
      'https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&family=Manrope:wght@400;500;600;700&family=Michroma&family=Unbounded:wght@500;700;800&display=swap',
  },

  /** Public URL once deployed, used for Open Graph and JSON-LD. */
  siteUrl: 'https://kayem.emkaydigitals.com',

  /** Demo-mode admin user shown on mock login. */
  demoOwner: { name: 'Emeka Okafor', email: 'owner@kayem.demo' },
} as const

export type City = (typeof brand.cities)[number]
