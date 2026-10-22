// Home page. Everything is read from data/clinic.ts and data/faq.ts.
// The page is prebuilt for speed; parts that depend on today's date stream in per visitor.

import { Suspense } from "react";
import { clinic, services } from "@/data/clinic";
import { formatTime } from "@/lib/schedule";
import { ClinicIllustration } from "@/components/ClinicIllustration";
import { DoctorDirectory } from "@/components/DoctorDirectory";
import { WhosInToday, WhosInTodaySkeleton } from "@/components/WhosInToday";
import { BookingSection, BookingSkeleton } from "@/components/BookingSection";
import { ScheduleView, WeeklySchedule } from "@/components/WeeklySchedule";
import { Faq } from "@/components/Faq";
import { SiteFooter } from "@/components/SiteChrome";
import Link from "next/link";
import { ChatIcon, ClockIcon, MapPinIcon, PhoneIcon } from "@/components/Icons";

const hours = `${formatTime(clinic.hours.open)} – ${formatTime(clinic.hours.close)}`;
const tel = `tel:${clinic.phone}`;
const whatsapp = `https://wa.me/${clinic.whatsapp}`;

export default function Home() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <a href="#main" className="flex items-center gap-3 text-ink no-underline">
            <span aria-hidden="true" className="flex size-11 items-center justify-center rounded-xl bg-brand text-xl font-bold text-white">
              E
            </span>
            <span className="leading-tight">
              <span className="block font-bold">{clinic.name}</span>
              <span className="block text-sm text-muted">{clinic.address}</span>
            </span>
          </a>
          <nav aria-label="Main" className="hidden items-center gap-7 text-base font-medium lg:flex">
            <a href="#doctors" className="hover:text-brand">Doctors</a>
            <a href="#schedule" className="hover:text-brand">Schedule</a>
            <a href="#book" className="hover:text-brand">Book</a>
            <a href="#services" className="hover:text-brand">Services</a>
            <a href="#faq" className="hover:text-brand">FAQ</a>
            <a href="#visit" className="hover:text-brand">Visit us</a>
          </nav>
          <a
            href={tel}
            className="hidden min-h-11 items-center gap-2 rounded-xl bg-brand px-5 text-base font-semibold text-white hover:bg-brand-dark sm:inline-flex"
          >
            <PhoneIcon className="size-4" />
            {clinic.phoneDisplay}
          </a>
        </div>
      </header>

      <main id="main" className="pb-24 sm:pb-0">
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
              <a
                href="#book"
                className="inline-flex min-h-13 items-center rounded-2xl bg-brand px-7 text-lg font-semibold text-white hover:bg-brand-dark"
              >
                Book a doctor
              </a>
              <a
                href={tel}
                className="inline-flex min-h-13 items-center gap-2 rounded-2xl border border-line bg-white px-6 text-lg font-semibold hover:border-brand"
              >
                <PhoneIcon /> Call {clinic.phoneDisplay}
              </a>
            </div>
            <p className="flex flex-wrap gap-x-6 gap-y-1 text-base text-muted">
              <span className="inline-flex items-center gap-2"><ClockIcon className="size-4" /> Open {hours}</span>
              <span className="inline-flex items-center gap-2"><MapPinIcon className="size-4" /> {clinic.address}</span>
            </p>
          </div>
          <div className="overflow-hidden rounded-3xl border border-brand-line">
            <ClinicIllustration />
          </div>
        </section>

        {/* Who's in today */}
        <section aria-labelledby="today" className="mx-auto max-w-6xl scroll-mt-24 px-5 pb-14">
          <div className="rounded-3xl border border-line bg-white p-6 sm:p-8">
            <Suspense fallback={<WhosInTodaySkeleton />}>
              <WhosInToday />
            </Suspense>
          </div>
        </section>

        {/* Doctors */}
        <section aria-labelledby="doctors" className="scroll-mt-20 border-y border-line bg-white py-14">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5">
            <div>
              <h2 id="doctors" className="text-3xl font-bold sm:text-4xl">Our doctors</h2>
              <p className="mt-1 text-muted">Pick by what&apos;s bothering you. Each specialist sits on fixed days.</p>
            </div>
            <DoctorDirectory />
            <p className="text-base text-muted">
              More specialists visit every week. Not sure who to see?{" "}
              <a href={tel} className="font-semibold text-brand underline">Call reception</a> and they&apos;ll guide you.
            </p>
          </div>
        </section>

        {/* Weekly schedule */}
        <section aria-labelledby="schedule" className="mx-auto max-w-6xl px-5 pt-14">
          <h2 id="schedule" className="text-3xl font-bold sm:text-4xl">Weekly OPD schedule</h2>
          <p className="mb-6 mt-1 text-muted">Plan your visit. Timings can change on holidays, so call if you&apos;re unsure.</p>
          <Suspense fallback={<ScheduleView />}>
            <WeeklySchedule />
          </Suspense>
        </section>

        {/* Booking */}
        <section aria-labelledby="book-heading" id="book" className="mx-auto grid max-w-6xl gap-10 px-5 py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="flex flex-col gap-5">
            <h2 id="book-heading" className="text-3xl font-bold sm:text-4xl">Book in under a minute</h2>
            <ol className="flex list-decimal flex-col gap-3 pl-6 text-lg">
              <li>Choose your doctor.</li>
              <li>Pick one of their OPD days and a time.</li>
              <li>Add your name and mobile number.</li>
              <li>Press Send in WhatsApp. Reception calls you to confirm.</li>
            </ol>
            <div className="rounded-2xl border border-line bg-white p-5">
              <p className="font-semibold">Your privacy</p>
              <p className="text-base text-muted">
                We ask only your name and number. The message names your doctor, never the reason for your visit, and
                nothing is saved on your phone.{" "}
                <Link href="/privacy" className="font-semibold text-brand underline">
                  Privacy notice
                </Link>
              </p>
            </div>
            <p className="text-base text-muted">
              Prefer to talk? <a href={tel} className="font-semibold text-brand underline">Call {clinic.phoneDisplay}</a>
            </p>
          </div>
          <Suspense fallback={<BookingSkeleton />}>
            <BookingSection />
          </Suspense>
        </section>

        {/* Services */}
        <section aria-labelledby="services" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-14">
          <h2 id="services" className="text-3xl font-bold sm:text-4xl">Tests and services in-house</h2>
          <p className="mt-1 text-muted">No need to go elsewhere for scans, reports or medicines.</p>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => (
              <li key={service.id} className="flex flex-col gap-1 rounded-2xl border border-line bg-white p-6">
                <h3 className="text-xl font-bold">{service.name}</h3>
                <p className="text-base text-muted">{service.description}</p>
                {service.lead && <p className="mt-auto pt-2 text-base font-medium">With {service.lead}</p>}
              </li>
            ))}
          </ul>
        </section>

        {/* FAQ */}
        <section aria-labelledby="faq" className="mx-auto max-w-4xl px-5 pb-14">
          <h2 id="faq" className="mb-6 text-3xl font-bold sm:text-4xl">Questions patients ask</h2>
          <Faq />
        </section>

        {/* Visit us */}
        <section aria-labelledby="visit" className="mx-auto max-w-6xl scroll-mt-20 px-5 pb-16">
          <div className="grid gap-8 rounded-3xl border border-line bg-white p-6 sm:p-10 md:grid-cols-2">
            <div className="flex flex-col gap-4">
              <h2 id="visit" className="text-3xl font-bold sm:text-4xl">Visit us</h2>
              <p className="flex items-start gap-3 text-lg">
                <MapPinIcon className="mt-1 size-5 shrink-0 text-brand" />
                <span>{clinic.name}<br />{clinic.address}</span>
              </p>
              <p className="flex items-start gap-3 text-lg">
                <ClockIcon className="mt-1 size-5 shrink-0 text-brand" />
                <span>
                  Open {hours}
                  <br />
                  <span className="text-base text-muted">Specialists sit on their OPD days only.</span>
                </span>
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="overflow-hidden rounded-2xl border border-line">
                <iframe
                  src={clinic.mapEmbedUrl}
                  title={`Map: ${clinic.landmark.name}, opposite ${clinic.name}`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="block h-64 w-full border-0"
                />
              </div>
              <p className="text-base text-muted">
                The pin shows {clinic.landmark.name}. {clinic.name} is directly opposite.
              </p>
              <a href={tel} className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-brand px-6 text-lg font-semibold text-white hover:bg-brand-dark">
                <PhoneIcon /> Call {clinic.phoneDisplay}
              </a>
              <a href={whatsapp} className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl border border-line px-6 text-lg font-semibold hover:border-brand">
                <ChatIcon /> WhatsApp us
              </a>
              <a href={clinic.mapUrl} className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl border border-line px-6 text-lg font-semibold hover:border-brand">
                <MapPinIcon /> Get directions
              </a>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />

      {/* Phone: sticky Call / Book bar */}
      <nav
        aria-label="Quick actions"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-3 border-t border-line bg-white px-4 pb-4 pt-3 sm:hidden"
      >
        <a href={tel} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand font-semibold text-white">
          <PhoneIcon /> Call
        </a>
        <a href="#book" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-ink font-semibold text-white">
          Book
        </a>
      </nav>

      {/* Desktop: floating WhatsApp button */}
      <aside aria-label="WhatsApp">
        <a
          href={whatsapp}
          aria-label="Message the clinic on WhatsApp"
          title="WhatsApp"
          className="fixed bottom-6 right-6 z-40 hidden size-14 items-center justify-center rounded-full bg-ink text-white shadow-lg hover:bg-slate-800 sm:inline-flex"
        >
          <ChatIcon className="size-6" />
        </a>
      </aside>
    </>
  );
}
