# Eternal Polyclinic website

@AGENTS.md

A booking website for Eternal Polyclinic, Opposite SDH Hospital, Sopore (a real clinic).
Patients find a visiting specialist, see the days that doctor sits, and request a slot
in under 60 seconds with no account. Reception confirms every request by phone.

## Stack

- Next.js 16 (App Router), TypeScript, Tailwind CSS v4, deployed on Vercel
- Font: Plus Jakarta Sans, self-hosted via `@fontsource-variable/plus-jakarta-sans`
- V1 sends booking requests to the clinic on WhatsApp (`lib/booking.ts`); nothing is stored, on the server or the patient's phone.
  Decision (23 Oct 2026): NO database and NO reception view for now. Reception works from WhatsApp.
  Revisit only if bookings get busy. If ever added: Supabase (Mumbai region), keys in Vercel env vars, never in the repo (it is public).
- Validation: zod. Tests: `npm test` (node test runner via tsx, files in `tests/`). Run them before every push.

## Where things live

- `data/clinic.ts`: every clinic fact (doctors, OPD days, in-house services, hours, phone, fee, founder). The ONLY place these are written. A doctor with `name: null` is unconfirmed: show the speciality, never a placeholder like "[Name]".
- `lib/schedule.ts`: who's in today, next OPD dates, time slots, display helpers. Pure functions that take `now`.
- `lib/booking.ts`: booking validation against the real schedule, and the WhatsApp message.
- `data/faq.ts`: FAQ answers; they pull the fee, phone and services from `clinic.ts`.
- Map: the clinic isn't listed on Google Maps and a search for its name finds a DIFFERENT clinic. Directions and the map
  use the clinic's exact coordinates (`clinic.location`, the Old Municipal Office building). Never link to a name search.
- `components/`: page sections. `WhosInToday`, `BookingSection`, `WeeklySchedule` and the doctors `?type=` reader are per-request
  (io() / searchParams) inside `<Suspense>`. Their placeholders are sized like the real thing (no layout jump; keep it that way).
- Pages: `/` (hero with find box and chips, dark Today card, specialists, tests, visit), `/doctors` (find box, chips, cards,
  weekly schedule; `/doctors?type=skin` opens with a chip chosen), `/book`, `/services`, `/faq`, `/contact`, `/privacy`.
  Header (`SiteHeader`), footer and WhatsApp button (`SiteChrome`), and the phone/tablet bottom tab bar (`TabBar`: Home,
  Doctors, Book, More sheet) are mounted in `app/layout.tsx`.
- Design C (chosen 23 Oct 2026, mockups on the design canvas): ground `#f4f6f5`, white `card` surfaces (a utility in
  globals.css; pair with `rounded-3xl`) without borders, pill buttons, ink (`bg-ink`) for primary actions and the Today card,
  `glow` for teal text on ink. Doctors show `DoctorMark` (initial, or speciality icon) until real photos arrive.
- Deep link `/book?doctor=<doctor id>` (e.g. `/book?doctor=akash`) opens the form with that doctor chosen.
  Old one-page links (`/#book-akash`) are forwarded by `LegacyBookingLink`.
- `app/privacy/page.tsx`: privacy notice. Update its date and text whenever data handling changes (e.g. the V2 database).
- Logo (emblem "A", chosen 23 Oct 2026): `components/Logo.tsx` in the header; print files in `brand/`
  (`logo.svg`, PNGs, horizontal lockups). The favicon `app/icon.svg` is `brand/logo-small.svg`, a simplified
  version for 16–48px. `app/apple-icon.png` is the full emblem on white. The logo's gold and blue are the only
  colours allowed outside rule 6, and only inside the emblem.
- `app/globals.css`: design tokens (`brand`, `ink`, `muted`, `ground`, `line`, `emergency`, `glow`), the `card` utility, the phone type scale.

## Rules

1. Never hard-code a doctor, time, phone number or fee in a component. Read it from `data/clinic.ts`.
2. All dates and times are clinic time, Asia/Kolkata. Use `clinicClock()`; never `new Date().getDay()` directly.
   Vercel servers run in UTC, so a plain `getDay()` is wrong for 5.5 hours every night.
3. Anything that depends on today's date ("Who's in today", today's slots) must be computed per request
   or on the client, never frozen at build time. Check the Next.js 16 docs in `node_modules/next/dist/docs/` for how.
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
   Audit baseline (23 Oct 2026, design C): axe 0 violations on all pages; Lighthouse mobile home 98, other pages 95–99,
   accessibility / best practices / SEO 100, layout shift 0. Don't ship below it.
10. Design C redesign ✓ (built on branch `redesign-c`, merged 23 Oct 2026).
