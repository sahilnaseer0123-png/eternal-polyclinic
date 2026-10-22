// Home: hero, Who's in today, and shortcuts to the other pages. Kept short on purpose.

import Link from "next/link";
import { Suspense } from "react";
import { clinic, doctors, services } from "@/data/clinic";
import { formatTime } from "@/lib/schedule";
import { ClinicIllustration } from "@/components/ClinicIllustration";
import { WhosInToday, WhosInTodaySkeleton } from "@/components/WhosInToday";
import { LegacyBookingLink } from "@/components/LegacyBookingLink";
import { CalendarIcon, ClockIcon, MapPinIcon, PhoneIcon } from "@/components/Icons";

const hours = `${formatTime(clinic.hours.open)} – ${formatTime(clinic.hours.close)}`;

const shortcuts = [
  {
    href: "/doctors",
    title: "Our doctors",
    text: `${doctors.length} specialists on fixed days, with the weekly schedule.`,
  },
  { href: "/book", title: "Book an appointment", text: "Pick a doctor, a day and a time. Under a minute." },
  {
    href: "/services",
    title: "Tests and services",
    text: `${services.map((s) => s.name.toLowerCase()).join(", ")}.`.replace(/^./, (c) => c.toUpperCase()),
  },
  { href: "/contact", title: "Visit us", text: `${clinic.address}. Open ${hours}.` },
];

export default function Home() {
  return (
    <>
      <LegacyBookingLink />

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-12 md:grid-cols-2 md:py-16">
        <div className="flex flex-col gap-5">
          <p className="font-semibold text-brand">Specialist doctors in Sopore, on fixed days every week</p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            See the right specialist, close to home.
          </h1>
          <p className="text-lg text-muted">
            Visiting specialists, scans, a lab and a pharmacy under one roof. Consultation ₹{clinic.consultationFee}.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/book"
              className="inline-flex min-h-13 items-center rounded-2xl bg-brand px-7 text-lg font-semibold text-white hover:bg-brand-dark"
            >
              Book a doctor
            </Link>
            <a
              href={`tel:${clinic.phone}`}
              className="inline-flex min-h-13 items-center gap-2 rounded-2xl border border-line bg-white px-6 text-lg font-semibold hover:border-brand"
            >
              <PhoneIcon /> Call {clinic.phoneDisplay}
            </a>
          </div>
          <p className="flex flex-wrap gap-x-6 gap-y-1 text-base text-muted">
            <span className="inline-flex items-center gap-2">
              <ClockIcon className="size-4" /> Open {hours}
            </span>
            <span className="inline-flex items-center gap-2">
              <MapPinIcon className="size-4" /> {clinic.address}
            </span>
          </p>
        </div>
        <div className="overflow-hidden rounded-3xl border border-brand-line">
          <ClinicIllustration />
        </div>
      </section>

      {/* Who's in today */}
      <section aria-labelledby="today" className="mx-auto max-w-6xl px-5 pb-12">
        <div className="rounded-3xl border border-line bg-white p-6 sm:p-8">
          <Suspense fallback={<WhosInTodaySkeleton />}>
            <WhosInToday />
          </Suspense>
          <p className="mt-5 text-base">
            <Link href="/doctors#schedule" className="inline-flex min-h-11 items-center gap-2 font-semibold text-brand underline">
              <CalendarIcon className="size-4" /> See the full weekly schedule
            </Link>
          </p>
        </div>
      </section>

      {/* Shortcuts */}
      <section aria-labelledby="shortcuts" className="mx-auto max-w-6xl px-5 pb-16">
        <h2 id="shortcuts" className="sr-only">
          Find what you need
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {shortcuts.map((s) => (
            <li key={s.href}>
              <Link
                href={s.href}
                className="flex h-full flex-col gap-2 rounded-2xl border border-line bg-white p-6 hover:border-brand"
              >
                <span className="text-xl font-bold">{s.title} →</span>
                <span className="text-base text-muted">{s.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
