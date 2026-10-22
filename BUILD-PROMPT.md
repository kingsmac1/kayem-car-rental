# Build Prompt: Emkay Car Rental (Rental OS)

## Your role and how to work

You are building **Emkay Car Rental**, a premium, fully clickable demo of "Rental OS", a complete car rental management system. It will be shown to car rental companies in Nigeria to win them as clients, and then copied and rebranded for each client.

Work like this:

1. **Work autonomously.** Do not wait for my approval at any point. Write a short build plan into `PROGRESS.md`, then build every milestone in order. Only stop if something truly blocks you, and if so, write the blocker into `PROGRESS.md` and continue with the next milestone you can do.
2. **Keep a memory of your progress.** This is a big build that may span several sessions. Keep `PROGRESS.md` updated after every milestone: what is done, what is next, key decisions, known issues. **If you are starting a new session, read `PROGRESS.md` first and continue from where it left off.**
3. **Commit after every milestone** with a clear message (for example `milestone 3: WhatsApp concierge`), so any milestone can be undone on its own.
4. **Use the installed skills (see "Skills to use" below).** Read the relevant SKILL.md before each phase and follow its guidance over your own defaults. Do not load every skill at once; use the ones listed for each phase.
5. **Everything must work with no outside services.** All integrations (Supabase, payments, identity checks, WhatsApp, GPS, AI) come later. Use realistic mock data and a clean service layer so each one can be plugged in later without rewriting pages.
6. **Explain in plain language.** I am not a deep technical person. When you finish, tell me exactly how to run the project and what to click to see each part.

---

## Skills to use (by phase)

Only one main design-direction skill is used, so instructions don't conflict.

| Phase | Skills |
|---|---|
| Routing and overall approach | `70-frontend-skill-router`, `01-frontend-architecture`, `02-react`, `04-typescript` |
| Visual direction and design system | `frontend-design` (main design skill), `09-design-systems`, `no-ai-design-slop`, `tailwindcss` |
| Studying the reference site | `playwright-cli`, `html-to-interaction-prompts`, `browser-video-recording`, `stitched-full-page-capture` |
| Scroll motion | `gsap-core`, `gsap-timeline`, `gsap-scrolltrigger`, `gsap-react`, `gsap-web` (Lenis + ScrollTrigger sync), `24-lenis`, `cinematic-gsap-lenis-motion-system`, `35-pinned-scroll`, `horizontal-scroll-scenes`, `marquee-loop` |
| UI motion | `26-motion-react`, `micro-interaction`, `page-transition-animation`, `32-text-animation`, `40-cursor-effects`, `39-loading-experiences` |
| 3D depth hero | `42-react-three-fiber`, `43-drei`, `45-glsl-shaders`, `shader-glsl`, `add-mouse-driven-orbit` |
| Motion care | `gsap-performance`, `51-animation-performance`, `52-mobile-animation`, `50-motion-accessibility`, `accessible-animation` |
| Forms, data, quality | `12-forms-validation`, `11-accessibility`, `17-frontend-performance`, `18-image-optimization`, `unsplash-asset-images` |
| Checking your own work | `playwright-cli`, `workflow-progress-screenshots`, `iterate-until-verified` |
| Final polish | `impeccable` (run `/impeccable init` at the start, `/impeccable audit` and `/impeccable polish` at the end), `audit-ai-design-slop`, `audit-reference-originality` |

**Motion ownership rule:** GSAP + ScrollTrigger owns everything driven by scrolling. Motion (Framer Motion) owns component and route transitions, hovers, modals and toasts. Never animate the same element with both. Lenis must be synced with ScrollTrigger as the `gsap-web` skill describes.

---

## Tech stack (my normal stack)

- **Framework:** Vite + React + TypeScript, using TanStack Router.
- **Rendering:** client-side single-page app (no server rendering) so it deploys cleanly to Cloudflare Pages. Add `public/_redirects` containing `/* /index.html 200`.
- **Styling and components:** Tailwind CSS and shadcn/ui, restyled to the brand. Nothing should look like default shadcn.
- **Animation:** Motion (the `motion` package), GSAP with ScrollTrigger, Lenis, and Three.js via React Three Fiber + Drei for the depth hero.
- **Charts:** Recharts.
- **Maps:** Leaflet with react-leaflet and free dark map tiles (for example CARTO dark), with the required attribution.
- **Icons:** Lucide.
- **Forms:** React Hook Form + Zod.
- **Future backend:** Supabase. Do not connect it yet (see "Service layer").
- **Hosting:** Cloudflare Pages.

**Performance budget (many visitors are on phones with mobile data):**
- Code-split every route. The admin, driver, corporate and partner portals must not load on the public site.
- Load Three.js only on the home hero, lazily, after the first paint.
- The preloader must finish within 2 seconds and show only on the first visit of a session.
- Target a Lighthouse mobile performance score of 80+ on the home page.

---

## Brand and white-labelling (very important)

This system will be copied for many clients, so **all branding must live in one config file**: `src/config/brand.ts`.

That file controls the company name, logo text, tagline, colours, fonts, phone number, WhatsApp number, email, address, cities served, currency and social links. Changing that one file must rebrand the whole system. Never hard-code the brand name anywhere else. Colours must flow from the config into Tailwind/CSS variables.

Default values:

- **Company:** Emkay Car Rental
- **Tagline:** Premium cars. Zero hassle.
- **Phone (display):** +234 902 798 9060
- **Phone (tel link):** +2349027989060
- **WhatsApp:** wa.me/2349027989060
- **Email:** emkaydigitals@gmail.com
- **Cities:** Lagos, Abuja, Port Harcourt
- **Currency:** Nigerian Naira (₦), formatted like ₦85,000

Also:

- **Favicon:** the letter "E" in brand styling.
- **Meta tags:** title, description, Open Graph and JSON-LD (type `AutoRental`), all filled from the brand config.
- **No leftover branding** from any tool or template anywhere.

---

## Design direction

The site must feel like a luxury automotive brand: think a modern car launch website, not a template.

### Step zero: study the reference website

**Reference:** https://nickho-motorsports.nl

Before designing anything:

1. Use `playwright-cli` to open the site at 1440px and 390px wide. Scroll every section slowly, open and close the menu, hover links and buttons, and take screenshots at key moments of each animation. Fetching the HTML alone is not enough, because most of the motion is in JavaScript.
2. Write what you observe into `MOTION-SPEC.md`: the loader, menu open/close, page transitions, scroll reveals, counters, pinned sections, slider, cursor, hover effects, timing and easing.
3. Run `/impeccable init` and create `PRODUCT.md` and `DESIGN.md` for Emkay Car Rental based on this brief.

The customer website's motion, animation and interface must feel closely inspired by the reference **but not copied**. Do not copy its text, images, logos, code or font files. Rebuild the *feel* in our own code, for a car rental brand. At the end, run `audit-reference-originality` to confirm nothing was copied.

### Signature elements to adapt for Emkay Car Rental

1. **Depth-map 3D hero.** The reference uses photos with grayscale depth maps so the image shifts in 3D as the mouse moves. Recreate this with a WebGL depth-parallax shader (React Three Fiber): a hero car photo plus its depth map, reacting to the cursor and device tilt.
   - Stock photos do not come with depth maps. Create an approximate grayscale depth map yourself for the placeholder hero image (for example car in front, background behind, using gradients and a rough car shape), save it next to the photo, and note in the README how to replace it with a properly generated one later.
   - Fall back to simple layered CSS parallax on low-power devices, on mobile when the frame rate drops, and with reduced motion.
2. **Big stat numbers** in the hero, like a racing number board: "120+ Cars", "3 Cities", "10,000+ Trips", "24/7 Support". Count up on load.
3. **Text-roll hover** on every nav link and button: the label slides up and an identical copy slides in from below.
4. **Custom cursor** that changes label by context: "drag" on sliders, "view" on car cards, "book" on booking buttons. Hidden on touch devices.
5. **Full-screen overlay menu:** large animated links, plus socials and contact details, with a staggered reveal and a matching exit animation.
6. **Infinite logo marquee** for partners: payment partners, corporate clients and insurance partners (placeholder logos).
7. **Sticky chapter scroll:** a pinned section where text chapters change and images swap as you scroll. Use it for "How Emkay works".
8. **Draggable horizontal slider** with a "1/6" counter and a "Skip" link, for the featured fleet.
9. **Countdown and list section**, like the reference's race calendar, for "Upcoming peak dates": the December festive season, Easter and big events, each with a live countdown and a "Reserve early" button. Dates must be computed relative to today so they are always in the future.
10. **Optional hero video with a "Sound on" toggle** for an ambient engine or city-drive clip. Use a placeholder video, muted by default.
11. **Gallery grid** with hover reveals.
12. **Loader and page transitions** in the same racing style.

### Look and feel

- **Mood:** dark, cinematic, racing-inspired. Near-black backgrounds, off-white text, and **one racing-yellow accent** (set in the brand config) for highlights, buttons and key numbers. Sharp edges, fine 1px lines, big confident type, generous spacing.
- **Typography:** free Google Fonts only:
  - Headlines: **Unbounded**
  - Labels, navigation and specs: **Michroma**, uppercase with wide letter spacing
  - Body text: **Manrope**
  - Numbers and prices: **Geist Mono**
  Load only the weights you use.
- **Extra motion:** headlines reveal line by line, magnetic buttons, hover tilt on car cards, smooth Lenis scrolling, and a subtle grain texture. Smooth and premium, not busy. One clear motion idea per section.
- **Reduced motion:** respect `prefers-reduced-motion` everywhere with a calm, simple version.
- **Mobile:** every effect needs a smooth, lighter mobile version. Performance comes first.
- **Images:** high-quality car photos from Unsplash as placeholders (use the `unsplash-asset-images` skill). Keep every image path in one data file (`src/data/images.ts`) so they are easy to replace.
- **Responsiveness:** fully responsive and mobile-first.
- **Admin area:** same brand feel, but calmer and built for daily work. A clean dark dashboard with clear tables and cards, and minimal motion.

---

## Service layer (so integrations plug in later)

Create `src/services/` with one file per future integration. Each exports clear functions that currently return mock data (with a small realistic delay so loading states show), with a `// TODO: connect real provider` comment explaining what to replace:

| File | Future provider | Mock functions |
|---|---|---|
| `bookings.ts` | Supabase | create, list, update, cancel, extend bookings |
| `fleet.ts` | Supabase | cars, availability, status |
| `verification.ts` | Dojah or similar | `verifyNIN`, `verifyLicence`, `verifySelfie` (simulate success, failure and "needs review") |
| `payments.ts` | Paystack or Flutterwave | initialise payment, hold deposit, refund or deduct deposit |
| `whatsapp.ts` | WhatsApp Business API | send message, conversation list |
| `tracking.ts` | Traccar GPS server | live positions, trips, alerts, immobilise |
| `ai.ts` | AI provider | concierge replies, damage detection, business analyst answers |
| `notifications.ts` | Email and WhatsApp | reminders and alerts |

**Demo data that stays believable in every pitch:**
- Put all mock data in `src/mocks/`. Generate it from a fixed seed so it is the same every time.
- All booking dates are **relative to today** (for example "3 days ago", "returns tomorrow"), so the dashboard always looks live no matter when I demo it.
- Store changes made during a demo (new bookings, edits) in localStorage, so they survive a page refresh. Add a **"Reset demo data"** button in the demo switcher.
- Never store or log real NIN numbers or selfies; the verification flow is simulated only.

Make the data rich and realistic:
- About 20 cars: Toyota Camry, Corolla, Prado, Land Cruiser, Lexus RX and LX, Mercedes GLE and S-Class, Range Rover, Toyota Hiace, Coaster bus, Hyundai Elantra, and others.
- Nigerian customer names.
- Lagos, Abuja and Port Harcourt locations, including the airports.
- Naira prices.
- 60+ bookings across past, current and future dates.

Also create `supabase/schema.sql`: a complete database schema (tables, relationships, row level security policies) matching the mock data. I will paste it into the Supabase SQL Editor later. Do not run it.

Add a `.env.example` listing every future key (Supabase, Paystack, Dojah, WhatsApp, Traccar, AI). Add `.env` to `.gitignore`.

---

## Part 1: Customer website (public)

1. **Home**
   - Cinematic hero with a quick booking bar (city, pick-up date, return date, self-drive or chauffeur).
   - Fleet showcase.
   - How it works in 3 steps.
   - Why Emkay: verified and safe, tracked fleet, transparent damage process, 24/7 WhatsApp.
   - Services: self-drive, chauffeur, airport transfers, interstate, weddings and events, corporate.
   - Testimonials.
   - Corporate and partner call-to-action blocks.
   - FAQ.
   - Footer.
2. **Fleet page**
   - Filter by city, car type, price, seats, transmission, self-drive or chauffeur.
   - Shows live availability for chosen dates.
3. **Car detail page**
   - Gallery, specs, pricing (hourly, daily, weekly, monthly), deposit amount, requirements, availability calendar.
   - A "Book this car" button.
4. **Booking flow**, a multi-step wizard with a progress bar and a running price summary:
   1. Dates, times, pick-up and return locations (including airport options).
   2. Self-drive or chauffeur, plus extras (child seat, extra driver, interstate permit, security escort).
   3. **Identity verification:**
      - NIN entry.
      - Driver's licence photo upload.
      - **Live selfie capture using the device camera**, with a scanning animation and simulated result. If camera permission is denied or unavailable, offer a photo upload instead.
      - Shows "Verified", "Failed" or "Under review".
      - Returning verified customers skip this step.
   4. **Digital rental agreement:** a scrollable agreement and a **draw-your-signature pad**.
   5. **Payment:** a mock Paystack-style checkout showing rental cost + refundable deposit, with card, transfer and USSD tabs. Clearly label it as a demo.
   6. **Confirmation:** booking reference, pick-up details, and an "Add to WhatsApp" button.
5. **Customer account**
   - Login and signup (mock).
   - Upcoming and past trips, receipts, saved details, verification status.
   - **Extend rental** (price and pay).
   - **Report a problem** (breakdown or emergency).
   - One-tap rebook.
   - Referral code and rewards.
   - Inspection photos and any deposit deductions with photo evidence.
6. **Corporate page:** benefits and an enquiry form for companies, embassies, hotels and event planners.
7. **Partner car owners page:** "Earn from your car", an earnings calculator, how it works, and a sign-up form.
8. **About, Contact, FAQ, Terms and Privacy pages.**
9. **WhatsApp AI concierge demo.** This is the most important sales feature, so make it impressive.
   - A floating WhatsApp button opens a realistic **WhatsApp-style chat simulator**.
   - It must handle these conversations convincingly, with typing indicators:
     - Checking availability.
     - Quoting prices.
     - Booking a car inside the chat.
     - Sending a mock payment link.
     - Confirming the booking.
     - Extending a rental.
     - Reporting a breakdown.
     - Handing over to a human.
   - Use a scripted, smart mock in `ai.ts` that reads the real mock fleet data and understands loose phrasing (for example "I need a Prado in Abuja this weekend").
   - Add suggested reply chips so a pitch audience can tap through the main conversations quickly.

---

## Part 2: Admin dashboard (`/admin`)

Use a sidebar layout. Include a mock login and a **role switcher** (Owner, Manager, Front Desk, Fleet Officer) that changes what each role can see.

1. **Overview:** today's bookings, cars out, cars due back, overdue rentals, revenue today, this week and this month, payments outstanding, fleet utilisation, alerts feed, and quick actions.
2. **Bookings:**
   - Table and **calendar/timeline view** (cars as rows, days as columns, bookings as bars).
   - Create, edit, cancel, extend.
   - Status flow: pending → confirmed → active → returned → closed.
   - Double-booking prevention.
3. **Fleet:** every car with status (available, rented, maintenance, blocked), documents, mileage, profit and photos. Add and edit cars.
4. **Fleet Command Center**
   - A full-screen dark map with **cars moving in real time** (simulated along realistic roads in each city).
   - Click a car to see speed, fuel, mileage, driver or customer, and trip history replay.
   - **Geofences:** draw or select an approved area. A car leaving it fires an alert.
   - Alerts for overspeeding, harsh driving and late-night use.
   - **Remote immobiliser:** a two-step confirmation, and it only works when the car's speed is below 5 km/h. If the car is moving, show a safety message.
   - A "Share location" button for police or a recovery team.
5. **Inspections (check-out and check-in):**
   - A guided photo walkaround with prompts for front, rear, left, right, interior, dashboard (mileage and fuel).
   - **Before and after comparison** with an image slider and **AI-flagged damage markers** (simulated).
   - Calculates charges for damage, fuel shortfall, late return and fines, and deducts them from the deposit.
   - Generates a summary to send to the customer.
6. **Maintenance and documents:**
   - Service schedule by mileage.
   - Expiry tracking for vehicle licence, insurance, roadworthiness and proof of ownership, colour-coded (OK, expiring soon, expired).
   - Cars with expired documents or overdue servicing are automatically **blocked from booking**.
   - Full repair history and costs per car.
7. **Customers:** profiles, verification status and results, booking history, lifetime value, notes, **blacklist** with reason, and risk flags.
8. **Chauffeurs:** profiles, availability calendar, job assignment, trip logs, ratings, earnings and payouts.
9. **Pricing rules:**
   - Base rates per car.
   - Season rules (December festive season, Easter, public holidays), weekend and event pricing.
   - Long-stay discounts and same-day premiums.
   - Corporate and loyalty rates, and promo codes.
   - "Smart suggestions" that flag cars that are always idle or always sold out.
10. **Finance:**
    - Revenue charts.
    - **Profit per car** (revenue minus maintenance), utilisation.
    - Deposits held, refunded and deducted.
    - Outstanding payments, corporate invoices, partner payouts.
    - Export to CSV.
11. **AI Business Analyst:**
    - A chat panel where the owner asks questions in plain English ("Which car made the least money last month?", "Who are my top 10 customers?", "How many bookings are due back today?").
    - Answers are **computed from the mock data** (real calculations, not hard-coded text) with small charts or tables.
    - Includes suggested questions.
    - Also shows a preview of the **daily WhatsApp summary** sent to the owner.
12. **WhatsApp Inbox:** all concierge conversations, with status (bot handling or needs human), and the ability to take over a chat.
13. **Corporate accounts:** companies, their staff bookers, credit limits, monthly invoices.
14. **Partner owners:** listed cars, approval, earnings, commission rate, payouts.
15. **Marketing:** referrals, promo codes, and review requests (Google review prompts after trips).
16. **Settings:** brand settings preview (from the brand config), staff and roles, policies (deposit rules, fuel policy, late fees), and an **audit log** of staff actions.

---

## Part 3: Other portals

1. **Chauffeur app (`/driver`):** mobile-first.
   - Today's jobs, job details with customer, pick-up point and map.
   - Start and end trip.
   - Waiting time.
   - Earnings, ratings, availability toggle.
2. **Corporate portal (`/corporate`):** company dashboard to book cars for staff, view trips, download invoices, and manage staff bookers.
3. **Partner owner portal (`/partner`):** their cars, live status, bookings, earnings and payouts.

---

## Quality bar

- Every button and link goes somewhere or does something. No dead ends and no lorem ipsum.
- Loading states, empty states, success toasts and error states everywhere.
- Accessible: keyboard navigation, focus states, alt text, good colour contrast.
- Fast: lazy-load routes and images, within the performance budget above.
- No console errors. TypeScript passes. `npm run build` succeeds.
- A **"Demo mode" switcher** in a corner lets me jump between the customer site, admin dashboard, driver app, corporate portal and partner portal during a pitch, and includes "Reset demo data".

### Check your own work after every milestone

1. Run the dev server.
2. Use `playwright-cli` (fresh browser, never my real Chrome) to open every page built in that milestone at 1440px and 390px wide, click through the main flows, and take screenshots.
3. Check the browser console for errors.
4. Fix what you find, then commit and update `PROGRESS.md`.

---

## Milestones (keep a task list and tick these off)

1. Study the reference (`MOTION-SPEC.md`), `/impeccable init`, project setup, brand config, design system (colours, fonts, components, motion utilities), mock data, service layer.
2. Customer website, including the full booking flow and verification.
3. WhatsApp AI concierge simulator.
4. Admin: overview, bookings, fleet, customers.
5. Admin: Fleet Command Center (map, geofences, alerts, immobiliser).
6. Admin: inspections with AI damage comparison, maintenance and documents.
7. Admin: chauffeurs, pricing, finance, AI analyst, WhatsApp inbox, corporate, partners, marketing, settings.
8. Driver app, corporate portal, partner portal, demo mode switcher.
9. `supabase/schema.sql`, `.env.example`, `README.md` (plain-language: how to run, how to rebrand for a new client, how to replace images and the depth map, how each integration will be connected later).
10. Final polish: `/impeccable audit` and `/impeccable polish`, `audit-ai-design-slop`, `audit-reference-originality`, a full `playwright-cli` pass on every page at mobile and desktop widths, a Lighthouse check on the home page, bug fixes, and `npm run build`.

When everything is done, give me a plain-language summary: how to run it, the link for each part, what you tested, and a list of anything you could not finish.
