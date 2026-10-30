// Home (design C): "Which doctor do you need?", the dark Today card, specialists, tests, and how to find us.

import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { categories, clinic, doctors, services } from "@/data/clinic";
import { formatTime, opdShort } from "@/lib/schedule";
import { WhosInToday } from "@/components/WhosInToday";
import { LegacyBookingLink } from "@/components/LegacyBookingLink";
import { DoctorMark } from "@/components/DoctorMark";
import { NextAvailable } from "@/components/NextAvailable";
import { FeatherPattern } from "@/components/FeatherPattern";
import { ReceptionPhoto } from "@/components/ClinicPhoto";
import {
  ChevronRightIcon,
  ClockIcon,
  HospitalIcon,
  MapPinIcon,
  SearchIcon,
  ServiceIcon,
  ShieldCheckIcon,
  UserIcon,
} from "@/components/Icons";

// Every page names its own address for search engines (alternates.canonical); this is "/".
export const metadata: Metadata = { alternates: { canonical: "/" } };

const hours = `${formatTime(clinic.hours.open)} – ${formatTime(clinic.hours.close)}`;

export default function Home() {
  return (
    <>
      <LegacyBookingLink />

      {/* Hero + Today, over a faint feather pattern from the logo */}
      <div className="relative w-full max-w-full overflow-hidden">
        <FeatherPattern className="-right-24 -top-6 w-[22rem] opacity-[0.09] sm:w-[30rem] lg:-left-40 lg:right-auto lg:-top-16 lg:w-[46rem] lg:opacity-[0.07]" />
        <section className="relative mx-auto w-full max-w-6xl px-4 pt-6 sm:px-5 sm:pt-8 lg:pt-10">
          <div className="flex flex-col gap-7 sm:gap-8 lg:gap-10 w-full min-w-0 max-w-full">
            <div className="rise flex min-w-0 w-full max-w-full flex-col gap-4 sm:gap-5">
              <p className="text-sm font-semibold text-brand sm:text-base">
                Open {hours}
                <span className="hidden sm:inline"> · {clinic.address}</span>
              </p>
              <h1 className="text-[1.75rem] font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
                Which doctor do you need?
              </h1>
              <p className="max-w-2xl text-muted sm:text-lg">
                Visiting specialists on fixed days, with scans, a lab and a
                pharmacy under one roof.
              </p>
              {/* A real search box: typing here opens /doctors?q=... with the results. */}
              <Form
                action="/doctors"
                role="search"
                className="card flex max-w-2xl items-center gap-2 rounded-2xl pl-4 pr-1.5 focus-within:outline-3 focus-within:outline-ink sm:pl-5"
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
                  className="min-h-11 shrink-0 rounded-xl bg-ink px-5 font-semibold text-white hover:bg-slate-800"
                >
                  Find
                </button>
              </Form>
              <ul
                aria-label="Browse by speciality"
                className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-5 sm:px-5 sm:flex-wrap w-[calc(100%+2rem)] sm:w-[calc(100%+2.5rem)] max-w-none"
              >
                <li className="shrink-0">
                  <Link
                    href="/doctors"
                    className="inline-flex min-h-11 items-center rounded-full bg-ink px-4 font-semibold text-white transition-colors hover:bg-slate-800"
                  >
                    All doctors
                  </Link>
                </li>
                {categories.map((c) => (
                  <li key={c.id} className="shrink-0">
                    <Link
                      href={`/doctors?type=${c.id}`}
                      className="card inline-flex min-h-11 items-center rounded-full px-4 font-semibold transition-colors hover:text-brand"
                    >
                      {c.label}
                    </Link>
                  </li>
                ))}
              </ul>

              {/* Quick Action Hub: 4 Apollo-style high-intent cards */}
              <div className="grid grid-cols-2 gap-2.5 pt-2 sm:grid-cols-4 sm:gap-4 w-full min-w-0">
              <Link
                href="/doctors"
                className="group card card-hover flex flex-col justify-between rounded-3xl border border-line/60 p-3.5 transition-all duration-200 sm:p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-tint text-brand transition-colors group-hover:bg-brand group-hover:text-white sm:size-12">
                    <UserIcon className="size-5 sm:size-6" />
                  </span>
                  <span className="rounded-full bg-brand-tint px-2 py-0.5 text-[11px] font-bold text-brand sm:px-2.5 sm:text-xs">
                    12+ Doctors
                  </span>
                </div>
                <div className="mt-3">
                  <h3 className="font-bold text-ink group-hover:text-brand sm:text-lg">
                    Doctor OPD
                  </h3>
                  <p className="mt-0.5 text-xs text-muted sm:text-sm">
                    Visiting specialists &amp; super-specialists
                  </p>
                </div>
              </Link>

              <Link
                href="/services#ultrasound"
                className="group card card-hover flex flex-col justify-between rounded-3xl border border-line/60 p-3.5 transition-all duration-200 sm:p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 transition-colors group-hover:bg-sky-700 group-hover:text-white sm:size-12">
                    <ServiceIcon id="ultrasound" className="size-5 sm:size-6" />
                  </span>
                  <span className="rounded-full bg-sky-100/70 px-2 py-0.5 text-[11px] font-bold text-sky-800 sm:px-2.5 sm:text-xs">
                    4 Days/Wk
                  </span>
                </div>
                <div className="mt-3">
                  <h3 className="font-bold text-ink group-hover:text-sky-700 sm:text-lg">
                    Ultrasound &amp; Echo
                  </h3>
                  <p className="mt-0.5 text-xs text-muted sm:text-sm">
                    Abdomen, pelvic &amp; heart scans
                  </p>
                </div>
              </Link>

              <Link
                href="/services#lab"
                className="group card card-hover flex flex-col justify-between rounded-3xl border border-line/60 p-3.5 transition-all duration-200 sm:p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 transition-colors group-hover:bg-amber-700 group-hover:text-white sm:size-12">
                    <ServiceIcon id="lab" className="size-5 sm:size-6" />
                  </span>
                  <span className="rounded-full bg-amber-100/70 px-2 py-0.5 text-[11px] font-bold text-amber-800 sm:px-2.5 sm:text-xs">
                    Fast Reports
                  </span>
                </div>
                <div className="mt-3">
                  <h3 className="font-bold text-ink group-hover:text-amber-700 sm:text-lg">
                    Diagnostic Lab
                  </h3>
                  <p className="mt-0.5 text-xs text-muted sm:text-sm">
                    Blood tests &amp; clinical pathology
                  </p>
                </div>
              </Link>

              <Link
                href="/services#pharmacy"
                className="group card card-hover flex flex-col justify-between rounded-3xl border border-line/60 p-3.5 transition-all duration-200 sm:p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 transition-colors group-hover:bg-emerald-700 group-hover:text-white sm:size-12">
                    <ServiceIcon id="pharmacy" className="size-5 sm:size-6" />
                  </span>
                  <span className="rounded-full bg-emerald-100/70 px-2 py-0.5 text-[11px] font-bold text-emerald-800 sm:px-2.5 sm:text-xs">
                    In-house
                  </span>
                </div>
                <div className="mt-3">
                  <h3 className="font-bold text-ink group-hover:text-emerald-700 sm:text-lg">
                    Pharmacy
                  </h3>
                  <p className="mt-0.5 text-xs text-muted sm:text-sm">
                    Prescribed medicines under one roof
                  </p>
                </div>
              </Link>
            </div>
          </div>

            <section aria-labelledby="today" className="rise rise-3 w-full min-w-0 max-w-full">
              <WhosInToday />
            </section>
          </div>
        </section>
      </div>

      {/* Institutional Trust & Scale Stats */}
      <section className="reveal mx-auto max-w-6xl px-5 pt-8 sm:pt-12">
        <div className="card grid grid-cols-2 gap-3 rounded-3xl border border-line/70 p-4 sm:grid-cols-4 sm:gap-6 sm:p-6">
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand sm:size-12 sm:rounded-2xl">
              <ShieldCheckIcon className="size-5 sm:size-6" />
            </div>
            <div>
              <p className="text-lg font-extrabold text-ink sm:text-2xl">Zero Reg.</p>
              <p className="text-[11px] leading-tight text-muted sm:text-sm">No clinic registration fee</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand sm:size-12 sm:rounded-2xl">
              <HospitalIcon className="size-5 sm:size-6" />
            </div>
            <div>
              <p className="text-lg font-extrabold text-ink sm:text-2xl">SKIMS &amp; GMC</p>
              <p className="text-[11px] leading-tight text-muted sm:text-sm">Experienced visiting doctors</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand sm:size-12 sm:rounded-2xl">
              <ClockIcon className="size-5 sm:size-6" />
            </div>
            <div>
              <p className="text-lg font-extrabold text-ink sm:text-2xl">Zero Wait</p>
              <p className="text-[11px] leading-tight text-muted sm:text-sm">Time-slotted appointments</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand sm:size-12 sm:rounded-2xl">
              <MapPinIcon className="size-5 sm:size-6" />
            </div>
            <div>
              <p className="text-lg font-extrabold text-ink sm:text-2xl">Opp. SDH</p>
              <p className="text-[11px] leading-tight text-muted sm:text-sm">Lone Complex, Sopore</p>
            </div>
          </div>
        </div>
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
            className="inline-flex min-h-11 items-center font-semibold text-brand transition-colors hover:underline"
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
                  className="card card-hover flex h-full flex-col justify-between rounded-3xl border border-line/60 p-3.5 transition-all duration-200 sm:p-4"
                >
                  <div>
                    <DoctorMark
                      doctor={doctor}
                      className="h-28 w-full rounded-2xl bg-brand-tint text-4xl text-brand sm:h-36 sm:text-5xl"
                    />
                    <div className="mt-3 flex flex-col px-1 leading-snug">
                      <span className="font-bold text-ink sm:text-lg">
                        {doctor.name ?? doctor.speciality}
                      </span>
                      <span className="mt-0.5 text-xs text-muted sm:text-sm">
                        {doctor.name ? doctor.speciality : "Name to be confirmed"}
                      </span>
                      <span className="mt-2 inline-block self-start rounded-full bg-brand-tint px-2.5 py-0.5 text-xs font-semibold text-brand">
                        {days ?? "Days coming soon"}
                      </span>
                    </div>
                  </div>
                  {days && (
                    <div className="mt-3 border-t border-line/70 px-1 pt-2">
                      <NextAvailable
                        doctorId={doctor.id}
                        fallback={"\u00a0"}
                        short
                        className="truncate text-xs font-bold text-brand"
                      />
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Tests and medicines + visit, on a soft tinted band */}
      <section className="mt-10 bg-brand-tint sm:mt-14">
        <div className="reveal mx-auto grid max-w-6xl gap-6 px-5 py-10 sm:py-14 lg:grid-cols-[2fr_1fr] lg:items-end">
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold tracking-tight sm:text-3xl">
              Tests and medicines
            </h2>
            <ul className="mt-4 grid grid-cols-4 gap-2 sm:gap-4">
              {services.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/services#${s.id}`}
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
            className="card card-hover flex flex-col gap-4 rounded-3xl border border-line/70 p-3 sm:p-4 lg:flex-row lg:items-center transition-all duration-200"
          >
            <ReceptionPhoto
              className="aspect-[3/2] rounded-2xl lg:w-[46%] lg:shrink-0"
              sizes="(min-width: 1024px) 180px, 100vw"
            />
            <span className="flex min-w-0 flex-1 items-center gap-4 px-1 pb-1 lg:px-0 lg:pb-0">
              <span className="flex size-12 shrink-0 lg:hidden items-center justify-center rounded-2xl bg-brand-tint text-brand">
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
            </span>
          </Link>
        </div>
      </section>
    </>
  );
}
