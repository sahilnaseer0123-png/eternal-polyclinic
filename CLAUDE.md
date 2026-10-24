# Eternal Polyclinic website

@AGENTS.md

A booking website for Eternal Polyclinic, Opposite SDH Hospital, Sopore (a real clinic).
Patients find a visiting specialist, see the days that doctor sits, and request a slot
in under 60 seconds with no account. Reception confirms every request by phone.

## Stack

- Next.js 16 (App Router), TypeScript, Tailwind CSS v4. Hosting (23 Oct 2026): Cloudflare Pages, free plan (Vercel's free plan
  forbids business sites; Pro is ~₹2,000/month). The site is a static export (`output: "export"` → `out/`): every page is a
  ready-made file, so there is no server code. Cloudflare builds `main` on every push (preset "Next.js (Static HTML Export)",
  build `npx next build`, output `out`). Live at `clinic.siteUrl` (https://eternal-polyclinic.pages.dev).
- Deploys stop silently if Cloudflare loses access to this repo (yellow "disconnected" banner in the Pages project).
  Fix: GitHub → Settings → Applications → Cloudflare Workers and Pages → Configure → Repository access must list
  BOTH tamyiz and eternal-polyclinic → Save. (Happened 23 Oct 2026.)
- Font: Plus Jakarta Sans, self-hosted via `@fontsource-variable/plus-jakarta-sans`
- V1 sends booking requests to the clinic on WhatsApp (`lib/booking.ts`); nothing is stored, on the server or the patient's phone.
  Decision (23 Oct 2026): NO database and NO reception view for now. Reception works from WhatsApp.
  Revisit only if bookings get busy. If ever added: Supabase (Mumbai region), keys in environment variables, never in the repo (it is public). A database means server code, so it would need Cloudflare Workers/Functions or a move back to a server host: decide then.
- Validation: zod. Tests: `npm test` (node test runner via tsx, files in `tests/`). Run them before every push.

## Where things live

- `data/clinic.ts`: every clinic fact (doctors, OPD days, in-house services, hours, phone, fee, founder). The ONLY place these are written. A doctor with `name: null` is unconfirmed: show the speciality, never a placeholder like "[Name]".
- `lib/schedule.ts`: who's in today, next OPD dates, time slots, display helpers. Pure functions that take `now`.
- `lib/booking.ts`: booking validation against the real schedule, and the WhatsApp message.
- `data/faq.ts`: FAQ answers; they pull the fee, phone and services from `clinic.ts`.
- Map: the clinic isn't listed on Google Maps and a search for its name finds a DIFFERENT clinic. Directions and the map
  use the clinic's exact coordinates (`clinic.location`, the Old Municipal Office building). Never link to a name search.
- `components/`: page sections. `WhosInToday`, `BookingSection`, `WeeklySchedule` and `DirectoryFromLink` (reads `?type=`/`?q=`)
  run in the visitor's browser (`useClinicMinute` / `useSearchParams`); the prebuilt pages hold placeholders sized like the
  real thing (no layout jump; keep it that way). `useSearchParams` users sit inside `<Suspense>`.
- Pages: `/` (hero with find box and chips, dark Today card, specialists, Book-in-3-steps band with `WhatsAppPreview`, tests, visit),
  `/doctors` (find box, chips, cards, weekly schedule; `/doctors?type=skin` opens with a chip chosen), `/doctors/[id]`
  (one static page per doctor: details, days, Book/Call, `ShareButton`), `/book`, `/services`, `/faq`, `/contact`, `/privacy`.
  Page links shared by header, More sheet and footer live in `components/nav.ts` (a plain module: server and client can import it).
  Header (`SiteHeader`), footer and WhatsApp button (`SiteChrome`), and the phone/tablet bottom tab bar (`TabBar`: Home,
  Doctors, Book, More sheet) are mounted in `app/layout.tsx`.
- Design C (chosen 23 Oct 2026, mockups on the design canvas): ground `#f4f6f5`, white `card` surfaces (a utility in
  globals.css; pair with `rounded-3xl`) without borders, pill buttons, ink (`bg-ink`) for primary actions and the Today card,
  `glow` for teal text on ink. Doctors show `DoctorMark` (initial, or speciality icon) until real photos arrive.
- Deep link `/book?doctor=<doctor id>` (e.g. `/book?doctor=akash`) opens the form with that doctor chosen.
  Old one-page links (`/#book-akash`) are forwarded by `LegacyBookingLink`.
- `app/privacy/page.tsx`: privacy notice. Update its date and text whenever data handling changes (e.g. the V2 database).
  Wording rule: the WEBSITE saves nothing, but the WhatsApp message stays in the patient's chat. Never say "nothing is saved on your phone".
- Visitor stats: Cloudflare Web Analytics, switched on in the Pages project (Metrics → Enable); Cloudflare injects the
  beacon on deploy, no code here. No cookies, no stored state, and it never logs query strings, so searches (`?q=`) stay
  private. The privacy notice describes it; keep them in step.
- `lib/structured-data.ts`: all schema.org JSON-LD (clinic in the layout; IndividualPhysician + breadcrumbs on doctor pages,
  named doctors only). No FAQPage: Google dropped FAQ rich results in May 2026.
- `app/opengraph-image.png` (+ `.alt.txt`): the preview picture when the link is shared on WhatsApp. Regenerate if the logo or name changes.
- Photos (24 Oct 2026): the clinic's real reception photo, `clinic.receptionPhoto` → `public/photos/reception-{640,1200}.webp`
  (3:2, cropped from the clinic's phone photo), drawn by `components/ClinicPhoto.tsx` (plain `<img>` with srcset: static
  export, so no next/image resizing). Shown on the home visit card and at the top of /contact (eager there: it's on screen at load).
- `app/not-found.tsx`: friendly 404 with Home, Book and Call.
- Logo (emblem "A", chosen 23 Oct 2026): `components/Logo.tsx` in the header; print files in `brand/`
  (`logo.svg`, PNGs, horizontal lockups). The favicon `app/icon.svg` is `brand/logo-small.svg`, a simplified
  version for 16–48px. `app/apple-icon.png` is the full emblem on white. The logo's gold and blue are the only
  colours allowed outside rule 6, and only inside the emblem.
- Page transitions (23 Oct 2026): `PageTransition` (React `<ViewTransition>`) in `app/template.tsx` and `app/doctors/template.tsx`;
  old page fades out, new one fades and rises 12px; header, tab bar and WhatsApp button are pinned (`view-transition-name`).
  `data-scroll-behavior="smooth"` on `<html>` is required in Next 16, or new pages open scrolled down under the header.
- Motion and rhythm (23 Oct 2026): rounded buttons/cards press in, card links lift on hover, hero text `.rise`s,
  sections below the fold use `.reveal` (one-time fade-in via `RevealOnScroll.tsx`), the More sheet slides up.
  All of it is off under prefers-reduced-motion. Home alternates bands: hero over `FeatherPattern`, specialists,
  teal "Book in 3 steps", tinted tests band. Never animate opacity on above-the-fold text (it delays LCP).
- Fonts: headings h1–h3 use Bricolage Grotesque (`--font-display`, set in a base layer so utilities still win), body uses
  Plus Jakarta Sans. Both self-hosted via @fontsource-variable.
- `app/manifest.ts` + `public/icons/`: add-to-home-screen app (standalone). Icons rendered from `brand/logo.svg`.
- Footer (`SiteFooter`): clinic, hours, pages, contact columns; on phones Hours + Contact sit side by side and Pages wraps last.
- Live "next free slot" (23 Oct 2026): `NextAvailable` + `useClinicMinute` compute `nextSlot()`/`slotLabel()` in the visitor's
  browser in clinic time (static pages stay static; the server snapshot is null and shows a same-height fallback line).
- `concerns` on each doctor in clinic.ts: common reasons in patient words, used by the home "What brings you in?" row,
  the doctors search, cards ("Helps with") and doctor pages. General guidance, checked against medical references
  23 Oct 2026 (the owner asked us to research it). Optional `emergencyHint` per doctor shows on their page (neurosurgeon: head injury signs).
- `EmergencyNote` (Book, Contact) + footer line + FAQ: not an emergency service; go to SDH Hospital opposite or call 112
  (`clinic.emergency`). The clinic confirmed SDH's emergency department is open 24 hours (23 Oct 2026).
- `app/globals.css`: design tokens (`brand`, `ink`, `muted`, `ground`, `line`, `emergency`, `glow`), the `card` utility, the phone type scale.

## Rules

1. Never hard-code a doctor, time, phone number or fee in a component. Read it from `data/clinic.ts`.
2. All dates and times are clinic time, Asia/Kolkata. Use `clinicClock()`; never `new Date().getDay()` directly.
   Build machines run in UTC and visitors may be anywhere, so a plain `getDay()` is wrong for 5.5 hours every night.
3. Anything that depends on today's date ("Who's in today", today's slots) must be computed in the visitor's browser
   (`useClinicMinute`), never frozen at build time: the site is static files, so build time is the only "server time".
4. Privacy: the booking form collects name, phone, doctor, date and time only. Never a reason for the visit.
   WhatsApp texts and confirmations name the doctor, never the speciality.
5. Accessibility: phones use a compact scale (body 15px, h1 24px, set by the `max-width: 639px` block in globals.css;
   the owner found 18px and then 16px too big on phones, 23 Oct 2026). 18px body from 640px up. Inputs stay 16px+ (iOS zooms smaller ones). Contrast at least 4.5:1, tap targets at least 44px, real `<button>`/`<a>`/`<label>`.
6. One brand colour (teal `brand`). Specialities are told apart by name and icon, not colour.
7. No invented facts: no fake reviews, stats or promises. Missing info stays as a visible TODO.
8. Small steps: one feature at a time, check it in the browser, then commit.

## Build order

1. Spec ✓  2. Mockups ✓  3. Project setup ✓
4. Clinic data ✓ (two doctors still need names and OPD days)
5. Layout: hero, Who's in today, doctor cards ✓
6. Booking form: doctor → OPD day → time → name and phone, WhatsApp link ✓
7. Reception view at `/admin`: dropped for now (see Stack). Don't build it unless asked.
8. Weekly schedule, FAQ, Visit us with map, floating WhatsApp ✓
9. Polish ✓: /privacy notice, favicon + apple icon, Open Graph, schema.org MedicalClinic, robots + sitemap.
   Audit baseline (23 Oct 2026, rechecked on the Cloudflare static build): axe 0 violations on all pages; Lighthouse mobile 92–100 (noisy run to run),
   accessibility / best practices / SEO 100, layout shift 0. Don't ship below it.
10. Design C redesign ✓ (built on branch `redesign-c`, merged 23 Oct 2026).
