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
import { ReceptionPhoto } from "@/components/ClinicPhoto";
import { PatientReviews } from "@/components/PatientReviews";
import {
  ChevronRightIcon,
  MapPinIcon,
  PhoneIcon,
  SearchIcon,
  ServiceIcon,
} from "@/components/Icons";

// Every page names its own address for search engines (alternates.canonical); this is "/".
export const metadata: Metadata = { alternates: { canonical: "/" } };

const hours = `${formatTime(clinic.hours.open)} – ${formatTime(clinic.hours.close)}`;

export default function Home() {
  return (
    <>
      <LegacyBookingLink />

      {/* Hero + Consultation Directory: Swiss Minimalist & Editorial Layout */}
      <div className="relative w-full max-w-full overflow-hidden bg-[#F7F7F3] border-b border-[#E2E4DC]">
        <section className="relative mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-14 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
            {/* Left: Refined Clinic Value Proposition */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-md bg-white border border-[#C4DBD8] px-3 py-1 text-xs font-semibold text-[#397C78] uppercase tracking-wider">
                  <span className="size-1.5 rounded-full bg-[#397C78]" />
                  Opposite SDH Hospital · Sopore
                </span>
                <span className="text-xs text-[#647077] font-medium hidden sm:inline">
                  Open {hours}
                </span>
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-[#142B3B] sm:text-5xl lg:text-5xl leading-[1.15] font-display">
                Specialist Medical Consultations &amp; Advanced Diagnostics
              </h1>

              <p className="text-base sm:text-lg text-[#647077] leading-relaxed max-w-xl font-normal">
                Serving the families of Sopore, Baramulla, and North Kashmir. Comprehensive specialist clinics with certified radiologists, cardiologists, and in-house diagnostic imaging under one roof.
              </p>

              {/* Minimalist Search & Doctor Filter */}
              <div className="flex flex-col gap-3 pt-1">
                <Form
                  action="/doctors"
                  role="search"
                  className="flex items-center rounded-xl bg-white border border-[#E2E4DC] p-1.5 pl-4 shadow-2xs focus-within:border-[#397C78] focus-within:ring-1 focus-within:ring-[#397C78] transition-all"
                >
                  <SearchIcon className="size-4 shrink-0 text-[#397C78]" />
                  <label htmlFor="home-find" className="sr-only">
                    Find a specialist doctor or diagnostic service
                  </label>
                  <input
                    id="home-find"
                    name="q"
                    type="search"
                    placeholder="Search specialist, symptom, or service (e.g. Heart, Echo, USG)..."
                    autoComplete="off"
                    className="min-h-11 min-w-0 flex-1 bg-transparent text-sm text-[#142B3B] outline-none placeholder:text-[#858D91]"
                  />
                  <button
                    type="submit"
                    className="min-h-10 shrink-0 rounded-lg bg-[#142B3B] px-5 text-sm font-semibold text-white hover:bg-[#252C30] transition-colors"
                  >
                    Find Doctor
                  </button>
                </Form>

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-xs font-semibold text-[#858D91] mr-1">Specialties:</span>
                  <Link
                    href="/doctors"
                    className="inline-flex items-center rounded-md bg-[#142B3B] px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-black"
                  >
                    All 12 Doctors
                  </Link>
                  {categories.slice(0, 6).map((c) => (
                    <Link
                      key={c.id}
                      href={`/doctors?type=${c.id}`}
                      className="inline-flex items-center rounded-md bg-white border border-[#E2E4DC] px-2.5 py-1 text-xs font-medium text-[#252C30] hover:border-[#397C78] hover:text-[#397C78] transition-colors"
                    >
                      {c.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Direct Booking & Phone Action */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/book"
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#397C78] px-6 text-sm font-semibold text-white shadow-xs hover:bg-[#2A5D5A] transition-all"
                >
                  Book OPD Appointment →
                </Link>
                <a
                  href={`tel:${clinic.phone}`}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#E2E4DC] bg-white px-5 text-sm font-semibold text-[#142B3B] hover:bg-[#F2F7F6] transition-colors"
                >
                  <PhoneIcon className="size-4 text-[#397C78]" />
                  <span>Call {clinic.phoneDisplay}</span>
                </a>
              </div>
            </div>

            {/* Right: Live OPD Consultation Timetable Widget */}
            <div className="lg:col-span-5 w-full">
              <section aria-labelledby="today" className="w-full">
                <WhosInToday />
              </section>
            </div>
          </div>
        </section>
      </div>

      {/* Structured Institutional Highlights (Clean Editorial Row) */}
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 border-b border-[#E2E4DC]">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          <div>
            <span className="block text-2xl font-bold tracking-tight text-[#142B3B] font-display">12 Specialists</span>
            <span className="block text-xs text-[#647077] mt-1">Visiting physicians from leading GMC &amp; SKIMS institutions</span>
          </div>
          <div>
            <span className="block text-2xl font-bold tracking-tight text-[#142B3B] font-display">In-House USG</span>
            <span className="block text-xs text-[#647077] mt-1">Ultrasound &amp; Echo diagnostics available on fixed days</span>
          </div>
          <div>
            <span className="block text-2xl font-bold tracking-tight text-[#142B3B] font-display">Opposite SDH</span>
            <span className="block text-xs text-[#647077] mt-1">1st Floor, Lone Complex, Old Municipal Office building</span>
          </div>
          <div>
            <span className="block text-2xl font-bold tracking-tight text-[#142B3B] font-display">₹0 Registration</span>
            <span className="block text-xs text-[#647077] mt-1">Transparent consultation fees with no extra clinic registration</span>
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

      {/* Patient Trust & Google Reviews Section */}
      <PatientReviews />

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
