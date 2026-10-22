# Eternal Polyclinic website

@AGENTS.md

A booking website for Eternal Polyclinic, Opposite SDH Hospital, Sopore (a real clinic).
Patients find a visiting specialist, see the days that doctor sits, and request a slot
in under 60 seconds with no account. Reception confirms every request by phone.

## Stack

- Next.js 16 (App Router), TypeScript, Tailwind CSS v4, deployed on Vercel
- Font: Plus Jakarta Sans, self-hosted via `@fontsource-variable/plus-jakarta-sans`
- V1 sends booking requests to the clinic on WhatsApp (`lib/booking.ts`); nothing is stored, on the server or the patient's phone.
  V2 adds a database (Supabase) and the reception view. Keys go in Vercel environment variables, never in the repo (it is public).
- Validation: zod. Tests: `npm test` (node test runner via tsx, files in `tests/`). Run them before every push.

## Where things live

- `data/clinic.ts`: every clinic fact (doctors, OPD days, in-house services, hours, phone, fee, founder). The ONLY place these are written. A doctor with `name: null` is unconfirmed: show the speciality, never a placeholder like "[Name]".
- `lib/schedule.ts`: who's in today, next OPD dates, time slots, display helpers. Pure functions that take `now`.
- `lib/booking.ts`: booking validation against the real schedule, and the WhatsApp message.
- `data/faq.ts`: FAQ answers; they pull the fee, phone and services from `clinic.ts`.
- Map: the clinic isn't on Google Maps and a search for its name finds a DIFFERENT clinic. Directions and the map use the
  landmark hospital's coordinates (`clinic.landmark`). Never link to a name search.
- `components/`: page sections. `WhosInToday`, `BookingSection` and `WeeklySchedule` read the time per request with `io()` inside `<Suspense>`.
- Deep link `/#book-<doctor id>` (e.g. `/#book-akash`) opens the booking form with that doctor chosen.
- `app/privacy/page.tsx`: privacy notice. Update its date and text whenever data handling changes (e.g. the V2 database).
- `app/globals.css`: design tokens (`brand`, `ink`, `muted`, `ground`, `line`, `emergency`).

## Rules

1. Never hard-code a doctor, time, phone number or fee in a component. Read it from `data/clinic.ts`.
2. All dates and times are clinic time, Asia/Kolkata. Use `clinicClock()`; never `new Date().getDay()` directly.
   Vercel servers run in UTC, so a plain `getDay()` is wrong for 5.5 hours every night.
3. Anything that depends on today's date ("Who's in today", today's slots) must be computed per request
   or on the client, never frozen at build time. Check the Next.js 16 docs in `node_modules/next/dist/docs/` for how.
4. Privacy: the booking form collects name, phone, doctor, date and time only. Never a reason for the visit.
   WhatsApp texts and confirmations name the doctor, never the speciality.
5. Accessibility: body text 18px, contrast at least 4.5:1, tap targets at least 44px, real `<button>`/`<a>`/`<label>`.
6. One brand colour (teal `brand`). Specialities are told apart by name and icon, not colour.
7. No invented facts: no fake reviews, stats or promises. Missing info stays as a visible TODO.
8. Small steps: one feature at a time, check it in the browser, then commit.

## Build order

1. Spec ✓  2. Mockups ✓  3. Project setup ✓
4. Clinic data ✓ (two doctors still need names and OPD days)
5. Layout: hero, Who's in today, doctor cards ✓
6. Booking form: doctor → OPD day → time → name and phone, WhatsApp link ✓
7. Reception view at `/admin`: needs the V2 database first (localStorage can't reach reception on a public site)
8. Weekly schedule, FAQ, Visit us with map, floating WhatsApp ✓
9. Polish ✓: /privacy notice, favicon + apple icon, Open Graph, schema.org MedicalClinic, robots + sitemap.
   Audit baseline (23 Oct 2026): axe 0 violations; Lighthouse mobile 97 / 100 / 100 / 100. Don't ship below it.
