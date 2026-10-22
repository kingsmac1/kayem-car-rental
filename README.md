# Emkay Car Rental — Rental OS (demo)

A fully clickable demo of a complete car-rental system: a cinematic customer website with booking, ID verification and a WhatsApp AI concierge, plus an admin dashboard, a chauffeur app, a corporate portal and a partner-owner portal.

Everything runs in the browser with realistic sample data. No outside services are connected yet — each one has a ready "socket" (see *Connecting real services* below).

---

## 1. Run it on your computer

You need **Node.js 20.19 or newer** (22 recommended) (download from nodejs.org).

```bash
npm install        # first time only
npm run dev        # starts the demo
```

Open the address it prints (usually **http://localhost:5173**).

To make the production version: `npm run build` (output goes to the `dist` folder), and `npm run preview` to look at it.

## 2. What to click during a pitch

Use the **Demo** button in the bottom-left corner (bottom-right inside the admin) to jump between portals at any time.

| Part | Link | Try this |
|---|---|---|
| Customer website | `/` | Move the mouse over the hero car (3D depth), scroll the page, open the yellow menu |
| Fleet | `/fleet` | Filter by city and dates — availability updates live |
| Car page | `/fleet/prado-lag` | Pick dates on the calendar, then **Book this car** |
| Booking flow | `/book` | 6 steps: trip → extras → **NIN + licence + live selfie** → **sign the agreement** → **Paystack-style payment** (click *Use test card*) → confirmation |
| WhatsApp concierge | green button, bottom-right of the website | Tap the suggestion chips: *Prado in Abuja this weekend*, *Book the first one*, *Yes, book it*, *I have paid*, *Extend my rental*, *My car broke down*, *Talk to a human* |
| My account | `/account` | Click *Use demo account*: trips, extend, report a problem, receipts, deposits with photo evidence, rewards |
| Corporate page | `/business` | Benefits + enquiry form |
| Partner owners page | `/earn` | Earnings calculator + sign-up form |
| Admin | `/admin` | Sign in (any role). Switch role with **Viewing as** to show what each role can see |
| Fleet Command | `/admin/command` | Live map, click a car, **Replay**, **Immobilise** (refuses while moving), **Share location**, **Edit geofence** |
| Inspections | `/admin/inspections` | *Start check-in* → *Use sample photo* ×6 → **Run AI damage check** → drag the before/after slider → *Deduct & send summary* |
| AI analyst | `/admin/analyst` | Tap the suggested questions — every answer is calculated from the data |
| Chauffeur app | `/driver` | Open a job → *Start driving* → *I’ve arrived* (waiting timer) → *Start trip* → *End trip* |
| Corporate portal | `/corporate` | Book a car for staff, invoices, staff bookers |
| Partner portal | `/partner` | Earnings, cars with live status, payouts |

**Demo tips**
- Dates are always relative to today, so the dashboard looks live whenever you pitch.
- Changes you make (new bookings, edits) are saved in that browser. **Demo → Reset demo data** restores the fresh sample data.
- Demo NIN rules: a NIN ending in **0** fails, ending in **9** goes to review, anything else passes. Card ending **0002** is declined.
- Log in to the booking step with `chiamaka.okonkwo@mail.demo` to see the *returning verified customer* skip.

## 3. Rebrand for a new client (one file)

Open **`src/config/brand.ts`** and change:

- `name`, `shortName`, `logoText`, `monogram` (the favicon letter), `tagline`, `description`
- `contact` (phone, WhatsApp number, email, address)
- `cities`, `currency`, `social` links, the hero `stats`
- `colors` (the accent yellow is `accent`) and `fonts`
- `siteUrl` (used for Open Graph and the JSON-LD `AutoRental` data)

Save — the whole site, admin, portals, page titles, meta tags and favicon update. Nothing else needs editing for the brand. (Also update the city locations in `src/mocks/locations.ts` if the client operates in other cities.)

## 4. Replace photos, video and the 3D depth map

- **All image paths live in `src/data/images.ts`.** Put new photos in `public/images/...` and change the paths there. Each photo has a full size and a `-sm` 640px version — export both as `.webp`.
- **Hero video:** `images.hero.video` (set to `''` to hide the *Play film / Sound on* buttons). The placeholder clip is from Mixkit (free licence) and is silent, so *Sound on* plays a soft synthesised engine hum.
- **Depth map** (`public/images/hero/hero-depth.png`): a grayscale picture the same shape as the hero photo — **white = close to the camera, black = far away**. The included one was made roughly from the photo itself. For a better effect, generate one from your new hero photo with a free depth tool (e.g. *Depth Anything* on Hugging Face, or Photoshop’s *Depth Blur* → output depth map), save it as PNG next to the photo, and point `images.hero.depth` at it. Keep it soft (slightly blurred) to avoid tearing at the edges.

Placeholder car photos are from Unsplash (free to use). Replace them with the client’s real fleet before going live.

## 5. Connecting real services later

Every integration sits behind one file in `src/services/`. Each function currently returns sample data after a short delay and is marked `TODO: connect real provider`. Swap the inside of the function; the pages don’t change.

| File | Will connect to | What changes |
|---|---|---|
| `bookings.ts`, `fleet.ts` | **Supabase** | Run `supabase/schema.sql` in Supabase → SQL Editor, then replace the `db` calls with Supabase queries. Double-booking is enforced by a database constraint in the schema. |
| `verification.ts` | **Dojah** (or Smile ID / Prembly) | Call NIN, licence and selfie-match endpoints from a Supabase Edge Function. Store only the result and reference — never the NIN or selfie. |
| `payments.ts` | **Paystack** or **Flutterwave** | Initialise the transaction server-side, open Paystack Inline/Checkout, confirm via webhook. Use pre-authorisation for deposits. |
| `whatsapp.ts` | **WhatsApp Business Cloud API** | A webhook Edge Function receives messages, stores them, and replies via the API. |
| `ai.ts` | **AI model** (e.g. Claude) | Concierge replies use tool calls (check availability, quote, book, pay, extend, breakdown, handover). Analyst questions are answered with SQL over the same tables. Damage detection uses a vision model on the check-out/check-in photos. |
| `tracking.ts` | **Traccar** GPS server | Read positions/trips/geofences from the Traccar API; send the immobiliser as a Traccar command, keeping the same two-step and *speed < 5 km/h* safety rule. |
| `notifications.ts` | **Email (Resend) + WhatsApp templates** | Reminders and alerts on a schedule (Supabase cron). |

All the keys you’ll need are listed in **`.env.example`** — copy it to `.env` (which is never committed). Secret keys go into Supabase Edge Function secrets, not into the website.

**Maps:** Fleet Command and the driver app use free Esri dark map tiles. CARTO’s dark tiles now need an API key; to use them, edit `src/config/map.ts`.

## 6. Deploy to Cloudflare Pages

1. Push the project to GitHub.
2. Cloudflare → Workers & Pages → Create → Pages → connect the repo.
3. Build command `npm run build`, output folder `dist`, environment variable `NODE_VERSION=22`.
4. `public/_redirects` is already set so every link works on refresh.

## 7. Tech notes (for developers)

Vite + React + TypeScript, TanStack Router (every page is code-split; admin and portals never load on the public site), Tailwind CSS v4, Radix primitives restyled shadcn-style, Motion for UI transitions, GSAP + ScrollTrigger + Lenis for scroll, React Three Fiber for the depth hero (loaded lazily, falls back to CSS parallax on low-power devices and for reduced motion), Recharts, Leaflet, React Hook Form + Zod, Immer.

Key folders: `src/config` (brand, map), `src/data` (images, copy), `src/mocks` (seeded sample data), `src/services` (integration sockets), `src/lib` (store, pricing, metrics, roles), `src/pages` (site, admin, driver, corporate, partner).

Project history and decisions: `PROGRESS.md`. Motion study of the reference site: `MOTION-SPEC.md`. Product and design notes: `PRODUCT.md`, `DESIGN.md`.
