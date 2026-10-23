// Home (design C): "Which doctor do you need?", the dark Today card, specialists, tests, and how to find us.

import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { categories, clinic, doctors, services } from "@/data/clinic";
import { formatTime, opdShort } from "@/lib/schedule";
import { WhosInToday, WhosInTodaySkeleton } from "@/components/WhosInToday";
import { LegacyBookingLink } from "@/components/LegacyBookingLink";
import { DoctorMark } from "@/components/DoctorMark";
import { NextAvailable } from "@/components/NextAvailable";
import { FeatherPattern } from "@/components/FeatherPattern";
import { WhatsAppPreview } from "@/components/WhatsAppPreview";
import {
  CalendarIcon,
  ChatIcon,
  ChevronRightIcon,
  MapPinIcon,
  SearchIcon,
  ServiceIcon,
  UserIcon,
} from "@/components/Icons";

const hours = `${formatTime(clinic.hours.open)} – ${formatTime(clinic.hours.close)}`;

// Two common reasons per doctor (from clinic.ts), for the "What brings you in?" row.
const REASONS = doctors.flatMap((d) => d.concerns.slice(0, 2));

const STEPS = [
  {
    Icon: UserIcon,
    title: "Choose your doctor",
    text: "By speciality or by name.",
  },
  {
    Icon: CalendarIcon,
    title: "Pick a day and time",
    text: "Only the days your doctor sits.",
  },
  {
    Icon: ChatIcon,
    title: "Send it on WhatsApp",
    text: "Reception calls you to confirm.",
  },
];

export default function Home() {
  return (
    <>
      <LegacyBookingLink />

      {/* Hero + Today, over a faint feather pattern from the logo */}
      <div className="relative overflow-hidden">
        <FeatherPattern className="-right-24 -top-6 w-[22rem] opacity-[0.09] sm:w-[30rem] lg:-left-40 lg:right-auto lg:-top-16 lg:w-[46rem] lg:opacity-[0.07]" />
        <section className="relative mx-auto grid max-w-6xl gap-6 px-5 pt-6 sm:pt-12 lg:grid-cols-[1.15fr_1fr] lg:gap-8 lg:pt-14">
          <div className="rise flex min-w-0 flex-col justify-center gap-4 sm:gap-5">
            <p className="text-sm font-semibold text-brand sm:text-base">
              Open {hours}
              <span className="hidden sm:inline"> · {clinic.address}</span>
            </p>
            <h1 className="text-[1.75rem] font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Which doctor do you need?
            </h1>
            <p className="max-w-xl text-muted sm:text-lg">
              Visiting specialists on fixed days, with scans, a lab and a
              pharmacy under one roof. Consultation ₹{clinic.consultationFee}.
            </p>
            {/* A real search box: typing here opens /doctors?q=... with the results. */}
            <Form
              action="/doctors"
              role="search"
              className="card flex max-w-xl items-center gap-2 rounded-2xl pl-4 pr-1.5 focus-within:outline-3 focus-within:outline-ink sm:pl-5"
            >
              <SearchIcon className="size-5 shrink-0 text-brand" />
              <label htmlFor="home-find" className="sr-only">
                Find a doctor or service
              </label>
              {/* text-lg keeps it 16px on phones, so iPhones don't zoom in */}
              <input
                id="home-find"
                name="q"
                type="search"
                placeholder="Doctor or test"
                autoComplete="off"
                className="min-h-13 min-w-0 flex-1 bg-transparent text-lg outline-none placeholder:text-muted sm:min-h-15"
              />
              <button
                type="submit"
                className="min-h-11 shrink-0 rounded-xl bg-ink px-4 font-semibold text-white hover:bg-slate-800"
              >
                Find
              </button>
            </Form>
            <ul
              aria-label="Browse by speciality"
              className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:flex-wrap"
            >
              <li className="shrink-0">
                <Link
                  href="/doctors"
                  className="inline-flex min-h-11 items-center rounded-full bg-ink px-4 font-semibold text-white"
                >
                  All doctors
                </Link>
              </li>
              {categories.map((c) => (
                <li key={c.id} className="shrink-0">
                  <Link
                    href={`/doctors?type=${c.id}`}
                    className="card inline-flex min-h-11 items-center rounded-full px-4 font-semibold hover:text-brand"
                  >
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <section aria-labelledby="today" className="rise rise-3 min-w-0">
            <Suspense fallback={<WhosInTodaySkeleton />}>
              <WhosInToday />
            </Suspense>
          </section>
        </section>
      </div>

      {/* What brings you in? Common problems, each opening the doctors that help with it. */}
      <section aria-labelledby="reasons" className="reveal mx-auto max-w-6xl pt-9 sm:pt-14">
        <div className="px-5">
          <h2 id="reasons" className="text-xl font-extrabold tracking-tight sm:text-3xl">
            What brings you in?
          </h2>
          <p className="mt-1 text-muted">Tap a problem to see who can help. Not sure? Call reception.</p>
        </div>
        <ul className="mt-3 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:flex-wrap">
          {REASONS.map((r) => (
            <li key={r} className="shrink-0">
              <Link
                href={`/doctors?q=${encodeURIComponent(r.toLowerCase())}`}
                className="card inline-flex min-h-11 items-center rounded-full px-4 font-semibold hover:text-brand"
              >
                {r}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Specialists */}
      <section
        aria-labelledby="specialists"
        className="reveal mx-auto max-w-6xl pt-10 sm:pt-14"
      >
        <div className="flex items-center justify-between px-5">
          <h2
            id="specialists"
            className="text-xl font-extrabold tracking-tight sm:text-3xl"
          >
            Specialists
          </h2>
          <Link
            href="/doctors"
            className="inline-flex min-h-11 items-center font-semibold text-brand"
          >
            See all
          </Link>
        </div>
        {/* Phones: swipe sideways. Wider screens: a grid. */}
        <ul className="mt-2 flex snap-x scroll-px-5 gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible lg:grid-cols-4">
          {doctors.map((doctor) => {
            const days = opdShort(doctor);
            return (
              <li
                key={doctor.id}
                className="w-44 shrink-0 snap-start sm:w-auto"
              >
                <Link
                  href={`/doctors/${doctor.id}`}
                  className="card flex h-full flex-col gap-3 rounded-3xl p-3 sm:p-4"
                >
                  <DoctorMark
                    doctor={doctor}
                    className="h-28 w-full rounded-2xl bg-brand-tint text-4xl text-brand sm:h-36 sm:text-5xl"
                  />
                  <span className="flex flex-col px-1 pb-1 leading-snug">
                    <span className="font-bold sm:text-lg">
                      {doctor.name ?? doctor.speciality}
                    </span>
                    <span className="text-sm text-muted sm:text-base">
                      {doctor.name ? doctor.speciality : "Name to be confirmed"}
                    </span>
                    <span className="pt-1.5 text-sm font-semibold text-brand">
                      {days ?? "Days coming soon"}
                    </span>
                    {days && (
                      <NextAvailable doctorId={doctor.id} fallback={"\u00a0"} short className="truncate text-sm font-semibold text-ink" />
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Book in 3 steps: a full-width teal band */}
      <section
        aria-labelledby="how"
        className="mt-10 bg-brand text-white sm:mt-14"
      >
        <div className="reveal mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-center lg:gap-16">
          <div>
            <h2 id="how" className="text-2xl font-extrabold tracking-tight sm:text-4xl">
              Book in 3 steps
            </h2>
            <p className="mt-2 text-teal-50 sm:text-lg">No account and no app. Under a minute, from any phone.</p>
            <ol className="mt-5 grid gap-2 sm:mt-6 sm:gap-3">
              {STEPS.map(({ Icon, title, text }, i) => (
                <li key={title} className="flex items-center gap-4 rounded-3xl bg-brand-dark p-3 sm:p-4">
                  <span className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white text-brand">
                    <Icon className="size-6" />
                    <span className="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">
                      {i + 1}
                    </span>
                  </span>
                  <span className="flex flex-col">
                    <span className="font-bold">{title}</span>
                    <span className="text-teal-50">{text}</span>
                  </span>
                </li>
              ))}
            </ol>
            <Link
              href="/book"
              className="mt-6 inline-flex min-h-12 items-center rounded-2xl bg-white px-6 font-bold text-ink hover:bg-teal-50"
            >
              Book a doctor
            </Link>
          </div>
          {/* What the request looks like when it reaches the clinic */}
          <WhatsAppPreview className="mx-auto hidden w-full max-w-sm sm:block lg:rotate-2" />
        </div>
      </section>

      {/* Tests and medicines + visit, on a soft tinted band */}
      <section className="bg-brand-tint">
        <div className="reveal mx-auto grid max-w-6xl gap-6 px-5 py-10 sm:py-14 lg:grid-cols-[2fr_1fr] lg:items-end">
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold tracking-tight sm:text-3xl">
              Tests and medicines
            </h2>
            <ul className="mt-4 grid grid-cols-4 gap-2 sm:gap-4">
              {services.map((s) => (
                <li key={s.id}>
                  <Link
                    href="/services"
                    className="flex h-full flex-col items-center gap-2 text-center text-sm font-semibold sm:card sm:items-start sm:rounded-3xl sm:p-5 sm:text-left sm:text-base"
                  >
                    <span className="card flex size-16 items-center justify-center rounded-2xl text-brand sm:size-12 sm:bg-brand-tint sm:shadow-none">
                      <ServiceIcon id={s.id} />
                    </span>
                    {s.short}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <Link
            href="/contact"
            className="card flex items-center gap-4 rounded-3xl p-4 sm:p-5"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-tint text-brand">
              <MapPinIcon className="size-6" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col leading-snug">
              <span className="font-bold">
                {clinic.address.replace(/, Sopore$/, "")}
              </span>
              <span className="text-sm text-muted sm:text-base">
                {clinic.location.name} building, Sopore · Map and directions
              </span>
            </span>
            <ChevronRightIcon className="size-5 shrink-0 text-slate-400" />
          </Link>
        </div>
      </section>
    </>
  );
}
