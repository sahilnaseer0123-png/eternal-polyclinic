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
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-6 pt-7 sm:py-12 md:grid-cols-2 md:py-16">
        <div className="flex flex-col gap-4 sm:gap-5">
          <p className="text-[0.95rem] font-semibold text-brand sm:text-base">Specialist doctors in Sopore, on fixed days every week</p>
          <h1 className="text-[2rem] font-bold leading-tight tracking-tight sm:text-5xl">
            See the right specialist, close to home.
          </h1>
          <p className="text-muted sm:text-lg">
            Visiting specialists, scans, a lab and a pharmacy under one roof. Consultation ₹{clinic.consultationFee}.
          </p>
          {/* On phones the Call/Book bar at the bottom already has both, so only Book shows here. */}
          <div className="flex flex-wrap gap-3">
            <Link
              href="/book"
              className="inline-flex min-h-12 items-center rounded-2xl bg-brand px-6 font-semibold text-white hover:bg-brand-dark sm:min-h-13 sm:px-7 sm:text-lg"
            >
              Book a doctor
            </Link>
            <a
              href={`tel:${clinic.phone}`}
              className="hidden min-h-13 items-center gap-2 rounded-2xl border border-line bg-white px-6 text-lg font-semibold hover:border-brand sm:inline-flex"
            >
              <PhoneIcon /> Call {clinic.phoneDisplay}
            </a>
          </div>
          <p className="flex flex-wrap gap-x-6 gap-y-1 text-[0.95rem] text-muted sm:text-base">
            <span className="inline-flex items-center gap-2">
              <ClockIcon className="size-4" /> Open {hours}
            </span>
            <span className="inline-flex items-center gap-2">
              <MapPinIcon className="size-4" /> {clinic.address}
            </span>
          </p>
        </div>
        {/* Hidden on phones so "Who's in today" sits right under the hero. */}
        <div className="hidden overflow-hidden rounded-3xl border border-brand-line md:block">
          <ClinicIllustration />
        </div>
      </section>

      {/* Who's in today */}
      <section aria-labelledby="today" className="mx-auto max-w-6xl px-5 pb-8 sm:pb-12">
        <div className="rounded-3xl border border-line bg-white p-5 sm:p-8">
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
        <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {shortcuts.map((s) => (
            <li key={s.href}>
              <Link
                href={s.href}
                className="flex h-full flex-col gap-1 rounded-2xl border border-line bg-white p-4 hover:border-brand sm:gap-2 sm:p-6"
              >
                <span className="text-lg font-bold sm:text-xl">{s.title} →</span>
                <span className="text-[0.95rem] text-muted sm:text-base">{s.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
