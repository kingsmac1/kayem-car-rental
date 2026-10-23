# Product

<!-- impeccable:product-schema 1 -->

> Written from BUILD-PROMPT.md without an interview: the owner asked for fully autonomous work. Facts below come from the brief; anything inferred is marked *(inferred)*.

## Platform

web

## Stack
Vite + React + TypeScript, TanStack Router, Tailwind + shadcn/ui (restyled), Motion, GSAP + ScrollTrigger, Lenis, React Three Fiber + Drei, Recharts, Leaflet, Lucide, React Hook Form + Zod. Client-side SPA on Cloudflare Pages. Supabase later.

## Users
- **Rental customers in Nigeria** (Lagos, Abuja, Port Harcourt) booking self-drive or chauffeur cars, often on phones over mobile data, frequently through WhatsApp.
- **Rental company staff:** Owner, Manager, Front Desk, Fleet Officer running daily operations from an admin dashboard.
- **Chauffeurs** working jobs from a phone.
- **Corporate clients** (companies, embassies, hotels, event planners) booking cars for staff.
- **Partner car owners** listing their cars to earn.
- **Pitch audience:** owners of Nigerian rental companies watching a live demo. The product is a sales demo first.

## Product Purpose
"Rental OS": one system that runs a car-rental business end to end — public booking site with identity verification, signed agreements and deposits, a WhatsApp AI concierge, GPS fleet command, inspections with damage evidence, finance and analytics. Success = rental company owners sign up after a demo; the system then gets rebranded per client from one config file.

## Positioning
Built for how Nigerian rental actually works: WhatsApp-first booking, NIN/licence/selfie verification before keys are handed over, refundable deposits with photo-evidenced deductions, tracked cars with a safe immobiliser, and Naira pricing with festive-season rules.

## Operating Context
Demos happen live in meetings on a laptop or phone. Data must look current on any day (dates relative to today), survive refreshes, and be resettable. A demo switcher jumps between portals.

## Capabilities and Constraints
- No external services yet: every integration is mocked behind `src/services/`.
- Never store or log real NIN numbers or selfies.
- White-label: all branding from `src/config/brand.ts`.
- Performance budget: portals code-split away from the public site; Three.js lazily on home hero only; Lighthouse mobile 80+.

## Brand Commitments
Default brand: **Kayem Car Rental**, tagline "Premium cars. Zero hassle." Contact +234 902 798 9060, emkaydigitals@gmail.com. Fonts pinned: Unbounded, Michroma, Manrope, Geist Mono. One racing-yellow accent on near-black.

## Evidence on Hand
No real testimonials, client logos, fleet photos or metrics. Everything is placeholder/mock and must read as demo content to be replaced per client (logos are placeholder wordmarks, testimonials are demo).

## Product Principles
1. Trust before keys: verification, agreements and evidence are visible, not hidden.
2. WhatsApp is the front door.
3. Every screen looks live during a pitch.
4. One file rebrands everything.
5. Phones and mobile data come first.

## Accessibility & Inclusion
WCAG AA contrast, keyboard navigation, visible focus, reduced-motion versions of every effect, touch-friendly targets.
