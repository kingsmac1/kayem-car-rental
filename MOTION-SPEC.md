# Motion Spec — observed on the reference, adapted for Kayem

Reference studied with playwright-cli at 1440×900 and 390×844 (screenshots in `research/`).
Stack observed: Webflow + GSAP 3 (ScrollTrigger, SplitText, CustomEase), Lenis (lerp 0.1, wheelMultiplier 0.7), Three.js r128 (depth hero), Swiper (sliders), HLS video.
Nothing below is copied — these are behaviour notes we rebuild in our own code, with our own content, fonts and images.

## Global shell
- **Grid lines:** 7 fine 1px vertical column lines run full height behind every section (low-contrast on dark, faint grey on light sections). Gives a "timing sheet" feel.
- **Header:** small logo mark top-left, single square accent-coloured menu button top-right (36px, two short lines). No visible nav links on desktop.
- **Scrolling:** Lenis smooth scroll, soft lerp (~0.1), slightly slowed wheel. ScrollTrigger synced to Lenis.
- **Colour rhythm:** sections alternate black and off-white backgrounds; one accent yellow used for highlights, buttons, active rows, counters.

## Loader
- White/blank screen, a row of 5 small squares near the bottom centre that fill with the accent colour one by one as progress (~1s on cached loads). Then the hero cuts in.
- **Kayem version:** near-black screen, 5 square "start lights" that light up yellow in sequence (F1 start-light idea), brand wordmark above, then a vertical wipe reveals the hero. Session-only, capped at 2s.

## Hero
- Full-bleed greyscale photo with depth-map WebGL parallax that shifts with the pointer.
- Giant condensed number in the centre (the racing number), with stat stacks in the left column (big number + small label) and right column (right-aligned short facts). Name/headline bottom-left with a short paragraph; "Next race" + value bottom-right.
- Sound-on toggle and contextual cursor labels ("drag", "See more", "Sound on") exist as hidden cursor states.
- **Kayem version:** car photo + generated depth map in an R3F shader; centre giant "E" / stat; left stack "120+ Cars / 3 Cities / 10,000+ Trips", right stack "24/7 Support" + cities; headline bottom-left; quick booking bar bottom. Numbers count up on load.

## Scrubbed manifesto paragraph
- Huge uppercase centred paragraph; words highlight from grey/black to accent yellow as you scroll (scrubbed), while small photos float in the side columns at different parallax speeds.
- **Kayem version:** "Why Kayem" manifesto; key phrases turn yellow as you scroll.

## Partner logo cloud
- Logos scattered across the grid columns around a centre product shot (helmet), revealing as you scroll; "Become partner" accent button below.
- **Kayem version:** infinite two-row marquee (payments, corporate clients, insurers) — the brief asks for a marquee.

## Pinned history chapters
- Black section pinned. Left: big chapter title. Centre: stacked images that scroll past/swap. Right: paragraph. Bottom-right counter "1/5" with a small square icon; centre "Skip »" accent button jumps past the pin.
- Titles and copy swap per chapter as scroll progresses.
- **Kayem version:** "How Kayem works" — 4 chapters (Choose, Verify, Drive, Return), images swap, counter "1/4", Skip link.

## Media slider
- Giant outlined/ghost heading text in the background ("MEDIA & ARTICLES"), solid heading over it, horizontal cards (image + caption) with prev/next arrows and drag cursor.
- **Kayem version:** draggable featured-fleet slider with "1/6" counter, Skip link and "drag" cursor.

## Calendar list
- Rows: bold race title + small series name, date right-aligned, separated by 1px lines. Hovering a row turns it accent-yellow and a car image follows the pointer vertically over the list. Heading "RACE [car image] 2026".
- **Kayem version:** "Upcoming peak dates" — each row has a live countdown and "Reserve early" button; a car image follows the hovered row.

## CTA / transition
- Checkered-flag pattern of grey squares fades in before a centred CTA block (heading, line, accent button with download icon).
- **Kayem version:** checkered strip into the corporate / partner CTA.

## Menu
- Full-screen accent-yellow overlay. Large condensed uppercase links stacked centre; hovering one dims siblings to ~25% opacity. Socials + email small at the bottom. Menu button turns into a black square with ×.
- Open: overlay wipes in (clip-path from top), links stagger up (~0.06s). Close: reverse, links fall away, overlay wipes up.
- **Kayem version:** same structure, our links + phone/WhatsApp/email, with text-roll hover.

## Buttons and links
- Small accent rectangle buttons, uppercase condensed label + » chevrons; label rolls up on hover (copy slides in from below).

## Timing / easing
- Reveals: 0.8–1.2s, expo/quart out (`power4.out`-ish), 0.05–0.08s stagger.
- Menu: ~0.6s in, ~0.45s out.
- Hover rolls: ~0.35s, `cubic-bezier(.7,0,.3,1)`.
- Scrubbed sections: `scrub: true`/~0.5 smoothing.

## Mobile
- Same hero composition stacked: stats left column, headline bottom; grid reduced to 2 lines; depth effect replaced by gentle static image. Pins become simple stacked sections.

## Reduced motion
- No pins, no scrub highlights (text shown final), no parallax/WebGL, fades only, loader skipped.
