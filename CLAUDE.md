# Eternal Polyclinic website

@AGENTS.md

A booking website for Eternal Polyclinic, Opposite SDH Hospital, Sopore (a real clinic).
Patients find a visiting specialist, see the days that doctor sits, and request a slot
in under 60 seconds with no account. Reception confirms every request by phone.

## Stack

- Next.js 16 (App Router), TypeScript, Tailwind CSS v4. Hosting (23 Oct 2026): Cloudflare Pages, free plan (Vercel's free plan
  forbids business sites; Pro is ~₹2,000/month). The site is a static export (`output: "export"` → `out/`): every page is a
  ready-made file; the only server code is Pages Functions (below). Cloudflare builds `main` on every push (preset "Next.js (Static HTML Export)",
  build `npx next build`, output `out`). Live at `clinic.siteUrl` (https://eternal-polyclinic.pages.dev).
- Deploys stop silently if Cloudflare loses access to this repo (yellow "disconnected" banner in the Pages project).
  Fix: GitHub → Settings → Applications → Cloudflare Workers and Pages → Configure → Repository access must list
  BOTH tamyiz and eternal-polyclinic → Save. (Happened 23 Oct 2026.)
- Font: Plus Jakarta Sans, self-hosted via `@fontsource-variable/plus-jakarta-sans`
- Server code: Cloudflare Pages Functions in `functions/` (the 23 Oct "no database" decision is superseded).
  - OPD register (appointments, doctor live status, overrides, custom doctors): one JSON blob in KV `EP_KV`
    (`functions/_lib/clinic-store.ts`). Online booking `functions/api/book.ts`, staff `functions/api/admin/state.ts`.
  - Clinic records (4 Nov 2026): Cloudflare D1 bound as **`EP_SQL`** (`functions/_lib/db.ts`, tables made on first use):
    staff, patients, appointments (mirror of the KV register linked to patients), lab_reports, report_links,
    notifications + notification_events, audit_log. NEVER bind D1 as `EP_DB`: clinic-store switches the whole register
    to `EP_DB` and the KV appointments would vanish. Setup: `docs/clinic-records-setup.md`. Without `EP_SQL` the site
    runs as before (PIN desk) and the new sections show "Setup needed".
  - Lab PDFs: private KV keys `lab-pdf:*` (10 MB max, validated). Never a public URL. R2 would need a card on file.
  - Staff logins (`functions/_lib/staff-auth.ts`): owner / reception / lab, PBKDF2 passwords, signed session cookie tied
    to session_version. The old shared PIN works only until the first owner account exists, then it is off for good.
  - WhatsApp (`functions/_lib/whatsapp.ts`, `notify.ts`): Meta Cloud API (recommended), Twilio or a gateway. Every message
    is a `notifications` row with a unique idempotency key: confirmation once per token (`appt:<token>`), lab report once
    per release (`lab-auto:<id>:<ready_at>`), manual resends get their own rows; retry only for Failed. Old/past
    appointments are recorded but never messaged. Lab PDFs go only to a VERIFIED mobile (staff confirmed it in person).
    Delivery webhooks: `/api/whatsapp/webhook` (Meta, signed) and `/api/whatsapp/twilio-status`. Setup: `docs/whatsapp-setup.md`.
  - Patient report link: `/report/#<token>` (token in the fragment, only its hash stored; 30 days; needs last 4 digits of
    the mobile; locks after 8 wrong tries). `functions/api/report/view.ts`.
  - Patient matching: same 10-digit mobile AND same name key = same patient (family members share phones). IDs `EPP-00042`.
  - Message wording lives in `lib/messages.ts` (approved 4 Nov 2026): confirmation, lab report, owner summary (no helpline).
- Validation: zod. Tests: `npm test` (node test runner via tsx, files in `tests/`; `tests/helpers/d1.ts` runs D1 on Node's
  built-in SQLite, so Node 22+). Run them before every push.

## Where things live

- `data/clinic.ts`: every clinic fact (doctors, OPD days, in-house services, hours, phone, fee, founder). The ONLY place these are written. A doctor with `name: null` is unconfirmed: show the speciality, never a placeholder like "[Name]".
- `lib/schedule.ts`: who's in today, next OPD dates, time slots, display helpers. Pure functions that take `now`.
- `lib/booking.ts`: booking validation against the real schedule, and the WhatsApp message.
- `data/faq.ts`: FAQ answers; they pull the fee, phone and services from `clinic.ts`.
- Map: the clinic isn't listed on Google Maps and a search for its name finds a DIFFERENT clinic. Directions and the map
  use the clinic's exact coordinates (`clinic.location`, the Old Municipal Office building). Never link to a name search.
- Dashboard `/admin` (`app/admin/page.tsx`): picks by sign-in state. Owner/reception get `components/admin/ReceptionDesk.tsx`
  (the old desk) with staff sections: Patients, Appointments, Lab Reports, Doctors (schedule editor), Specialists &
  Availability, WhatsApp, Statistics, Owner Reports, Find Token, Staff. Lab gets a lab-only console. Panels in `components/admin/`.
- Doctor schedule changes: one rule for browser and server, `lib/doctor-overrides.ts` (customOpd replaces days, leave has
  from/until and ends by itself). Public pages read it live (`DoctorSittings`, `ByAppointmentSection`, DayPicker, booking).
  Changing a schedule never edits booked appointments; the editor lists the ones that no longer fit.
- `components/`: page sections. `WhosInToday`, `BookingSection`, `WeeklySchedule` and `DirectoryFromLink` (reads `?type=`/`?q=`)
  run in the visitor's browser (`useClinicMinute` / `useSearchParams`); the prebuilt pages hold placeholders sized like the
  real thing (no layout jump; keep it that way). `useSearchParams` users sit inside `<Suspense>`.
- Pages: `/` (hero with find box and chips, dark Today card, specialists, Book-in-3-steps band with `WhatsAppPreview`, tests, visit),
  `/doctors` (find box, chips, cards, weekly schedule; `/doctors?type=skin` opens with a chip chosen), `/doctors/[id]`
  (one static page per doctor: details, days, Book/Call, `ShareButton`), `/book`, `/services`, `/faq`, `/contact`, `/privacy`.
  Page links shared by header, More sheet and footer live in `components/nav.ts` (a plain module: server and client can import it).
  Header (`SiteHeader`), footer and WhatsApp button (`SiteChrome`), and the phone/tablet bottom tab bar (`TabBar`: Home,
  Doctors, Book, More sheet) are mounted in `app/layout.tsx`.
- Design v3 "day-first" (2 Nov 2026, branch `redesign-v3`): light cream header, mist hero with a live `TodayCard`, night `#0B1917` footer only, cream ground, deep teal `brand`, mint on night, Fraunces headings (italic accent phrase) + Plus Jakarta Sans, 1px-border cards, no shadows, 12-14px radius buttons. Home = `components/DayPicker.tsx` (seven days, who sits; default day = today in clinic time, computed in the browser). The fake reviews page and its components were deleted (rule 7). The Booking form is the WhatsApp request again (no token slip). `/admin`: see Dashboard above (staff logins replace the PIN once the owner account exists). Inner pages inherit the new tokens; the older description below is superseded where it conflicts.
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
9. The full address appears only where people look for it: Contact page, home "Visit us", footer, the FAQ "where" answer,
   privacy notice and page metadata (4 Nov 2026). Not in the header, doctor pages, token slips, posters or WhatsApp texts.

## Build order

1. Spec ✓  2. Mockups ✓  3. Project setup ✓
4. Clinic data ✓ (two doctors still need names and OPD days)
5. Layout: hero, Who's in today, doctor cards ✓
6. Booking form: doctor → OPD day → time → name and phone, WhatsApp link ✓
7. Reception view at `/admin` ✓ (OPD register, then staff accounts, patients, lab reports, WhatsApp log, statistics: 4 Nov 2026).
8. Weekly schedule, FAQ, Visit us with map, floating WhatsApp ✓
9. Polish ✓: /privacy notice, favicon + apple icon, Open Graph, schema.org MedicalClinic, robots + sitemap.
   Audit baseline (23 Oct 2026, rechecked on the Cloudflare static build): axe 0 violations on all pages; Lighthouse mobile 92–100 (noisy run to run),
   accessibility / best practices / SEO 100, layout shift 0. Don't ship below it.
10. Design C redesign ✓ (built on branch `redesign-c`, merged 23 Oct 2026).
