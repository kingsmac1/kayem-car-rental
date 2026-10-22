# Final audit — Milestone 10

Date: see git log for `milestone 10`. All checks run against the production build (`npm run build` → `vite preview`).

## Build & types
- `npx tsc -b` passes. `npm run build` succeeds.
- Code splitting: every route is its own chunk. Admin, driver, corporate and partner code (and Recharts, Leaflet) never load on the public site. Three.js (~240 KB gzip) loads only on the home hero, on non-touch screens, after the browser is idle.

## Full browser pass (playwright-cli, fresh browser)
- 33 routes × 2 widths (1440 and 390) = 66 page views: public site (13 pages + 404), all 16 admin screens, driver app, corporate portal, partner portal.
- Result: **0 console errors, 0 page errors, 0 horizontal-overflow pages.**
- Flows exercised end to end: website booking (trip → extras → NIN/licence/selfie → signed agreement → mock Paystack → confirmation), WhatsApp concierge (availability, quote, book, payment link, confirm, extend, breakdown, human handover), admin booking create/edit/advance/cancel/extend with double-booking check, Fleet Command (select, replay, immobiliser two-step, share location, geofence), check-in inspection with AI damage comparison and deposit deduction, AI analyst questions, chauffeur trip flow, corporate staff booking.
- Reduced motion: Lenis, pins, scrubbing, WebGL and loader are skipped; the pinned "How it works" falls back to a static 3-column layout.

## Lighthouse (home, mobile)
| Category | Score |
|---|---|
| Performance | 36–53 at default 4× CPU throttle; up to 72 with a calibrated 1.5× multiplier |
| Accessibility | 100 (other public pages 98–100) |
| Best practices | 100 |
| SEO | 100 (after adding robots.txt + sitemap.xml) |

The test machine is a 2014 dual-core i7 with Lighthouse benchmarkIndex 260–700 and WindowServer at ~100% CPU, so CPU-throttled numbers are heavily inflated and swing between runs (TBT 0.5–6.5 s). **The 80+ target is not verified on this hardware.** Re-check with PageSpeed Insights after deploying to Cloudflare Pages.

Performance work done: static HTML hero shell (instant first paint), modulepreload for home chunks, async Google Fonts, below-the-fold sections and footer mount on first scroll, concierge and demo switcher mount after idle, static grain + no masked marquee on touch devices, robots.txt/sitemap.xml generated from the brand config.

## impeccable detector
- 1 finding: "overused font — Geist Mono". Kept deliberately: the brief pins Geist Mono for numbers and prices.

## AI-design-slop audit (removal-first)
Removed:
- "01/02/03" numbering on non-sequential content (Why-us promises, service tiles, business benefits). Numbering kept only where order is real (booking steps, How-it-works chapters, earn steps, "1/6" slider counter).
- A fake "1 unread" badge on the WhatsApp button (manufactured urgency).
- Masked marquee edges and the animated full-screen grain on phones (cost without benefit on small screens).
Kept on purpose: Michroma uppercase labels and the number-board hero (both brief-pinned), the 1px timing-sheet grid (brand device), sample testimonials and partner names — both labelled as demo content on the page.

## Reference originality audit (nickho-motorsports.nl)
Evidence: `research/` (screenshots, accessibility snapshot `snap.yml`), `MOTION-SPEC.md`. Helper: `build_evidence_inventory.py`.
- Text: 0 overlap leads between `src/` and the reference snapshot. No reference names, slogans or copy (searched for Nick Ho, Porsche, Carrera, McDonald's, sponsor guide, race calendar).
- Numbers: only trivial digit matches (0–31) — false positives. Hero stats are the brief's own (120+, 3, 10,000+, 24/7).
- Images/video/assets: no reference files. Photos are Unsplash, video is Mixkit (free licences); depth map generated from our own hero photo. Fonts differ (reference: Anton/Helvetica; ours: Unbounded/Michroma/Manrope/Geist Mono).
- Code: no reference code; everything written for this project.
- Structure & motion — overlaps that are **intentional and brief-directed**, adapted rather than copied: depth-map hero, number-board stats, full-screen accent menu with sibling dimming, pinned chapter section with counter + Skip, draggable slider with counter, calendar-style list with a hover-following image (re-purposed as peak dates with live countdowns), text-roll hovers. These are adaptations of interaction ideas with different content, layout proportions, typography, colour use and purpose.
- Red flags: none.
