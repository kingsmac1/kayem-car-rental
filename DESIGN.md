# Design — Emkay Car Rental

## Visual thesis
A night pit-lane timing sheet. Near-black asphalt, off-white type, fine 1px column lines like a timing grid, and one racing-yellow used only where the eye should go: the action, the key number, the live state. Starting lights, chequered flags and number boards are the native vocabulary.

## Tokens (all driven from `src/config/brand.ts` → CSS variables)
| Token | Value | Role |
|---|---|---|
| `--ink` | `#0A0A09` | page background (asphalt) |
| `--ink-2` | `#121211` | raised surface |
| `--ink-3` | `#1B1B19` | inputs, hover rows |
| `--line` | `rgba(242,239,232,.10)` | 1px rules and grid columns |
| `--paper` | `#F2EFE8` | primary text, light sections |
| `--mute` | `#9C988E` | secondary text (≥4.5:1 on ink) |
| `--accent` | `#FFD400` | racing yellow — CTA, key numbers, live state |
| `--accent-ink` | `#0A0A09` | text on yellow |
| `--ok` `#5BD08A`, `--warn` `#FFB020`, `--bad` `#FF5A4E` | status only (admin) |

Radii: 0 on public site (sharp), 2px in admin inputs. Shadows: none on public; admin popovers `0 12px 32px -8px rgba(0,0,0,.6)`.

## Type
- **Unbounded** 500/700/800 — headlines, display numbers. Tracking -0.02em, tight leading 0.95.
- **Michroma** 400 — labels, nav, specs. Uppercase, letter-spacing 0.14em, 10–12px. (Brief-pinned.)
- **Manrope** 400/500/600 — body, 15–17px, 1.55 leading, max 68ch.
- **Geist Mono** 400/500 — prices, numbers, booking refs, tabular data (`font-variant-numeric: tabular-nums`).

Scale (public): 12 / 14 / 16 / 20 / 28 / 40 / 64 / clamp(64–160) display.

## Layout
- 12-col grid, 16px gutters mobile, 24px tablet, 40px desktop; max 1440.
- Background grid lines: 6 columns desktop, 2 mobile, `--line` colour, fixed to sections.
- Sections alternate ink and paper (light) only for the manifesto and CTA bands.

## Components
- **Button primary:** yellow block, ink text, Michroma 11px, height 48, chevron icon, text-roll hover, magnetic on desktop.
- **Button ghost:** 1px paper line, transparent.
- **Car card:** image 4:3, name in Unbounded, specs in Michroma, price in Geist Mono with "/day", hover tilt + "view" cursor.
- **Inputs:** ink-3 fill, 1px line, yellow focus ring 2px offset.
- **Admin:** same tokens, Manrope-led, compact tables with 1px rules, status pills (ok/warn/bad/accent), minimal motion.

## Motion
GSAP owns scroll (reveals, pins, scrub, marquee). Motion owns component/route transitions, hovers, modals, toasts. Ease: `expo.out` / `cubic-bezier(.16,1,.3,1)` for reveals, `cubic-bezier(.7,0,.3,1)` for text-roll. Durations 0.35s hover, 0.6–1s reveals. See MOTION-SPEC.md. Reduced motion: fades only.
