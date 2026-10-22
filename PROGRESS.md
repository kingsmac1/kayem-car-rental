# Emkay Car Rental (Rental OS) — Progress

## Build plan
1. [x] M1 — Reference study (MOTION-SPEC.md), impeccable init (PRODUCT.md, DESIGN.md), Vite+React+TS+TanStack Router setup, brand config, design system, mock data, service layer
2. [x] M2 — Customer website + booking flow + verification
3. [x] M3 — WhatsApp AI concierge simulator
4. [x] M4 — Admin: overview, bookings, fleet, customers
5. [ ] M5 — Admin: Fleet Command Center
6. [ ] M6 — Admin: inspections, maintenance & documents
7. [ ] M7 — Admin: chauffeurs, pricing, finance, AI analyst, inbox, corporate, partners, marketing, settings
8. [ ] M8 — Driver app, corporate portal, partner portal, demo switcher
9. [ ] M9 — supabase/schema.sql, .env.example, README.md
10. [ ] M10 — Final polish, audits, full playwright pass, Lighthouse, build

## Status
M1–M4 done. Next: M5 Fleet Command Center (src/pages/admin/Command.tsx stub; simulation in src/services/tracking.ts).

## Key decisions
- Vite 8 + React 19 + TS 6, TanStack Router (code-based routes in src/router.tsx, every page lazy-loaded).
- `.npmrc` legacy-peer-deps=true (an optional peer of @hookform/resolvers conflicts; harmless).
- shadcn/ui pattern: Radix primitives (`radix-ui`) + cva + tailwind-merge, hand-written in src/components/ui, restyled.
- Tailwind v4 with `@theme inline` mapping to CSS vars that src/lib/theme.ts fills from src/config/brand.ts.
- index.html meta/OG/JSON-LD/favicon are filled at build time from brand.ts by a small Vite plugin (vite.config.ts).
- Demo data: seeded generator (src/mocks/generate.ts) → in-browser store (src/lib/db.ts) persisted to localStorage; dates auto-shift to stay relative to today.
- Unsplash images downloaded via the public download endpoint (search pages are bot-protected), converted to WebP 1400/640 in public/images.
- Hero depth map generated from the photo's luminance mask (public/images/hero/hero-depth.png).
- Store uses Immer (structural sharing) so selectors stay referentially stable.
- Concierge persona = logged-in customer if they have an active rental, else demo customer c-1 (Chiamaka, active Camry). Chat mirrors into admin inbox as conversation `w-sim`.
- Admin roles/access in src/lib/roles.ts; metrics (revenue, utilisation, profit, LTV) in src/lib/metrics.ts — reused by finance + AI analyst.
- `react-is` installed explicitly (Recharts peer, skipped by legacy-peer-deps).
- Public-site routes used: /business (corporate page) and /earn (partner owners page) because /corporate and /partner are the portals.

## Known issues
- `npx tsc -b` takes ~3 min on this machine while the dev server + browser run; it does pass.
- Hero "Sound on" plays a synthesised engine hum (src/components/site/hero/engineHum.ts) because the placeholder Mixkit clip is silent.
