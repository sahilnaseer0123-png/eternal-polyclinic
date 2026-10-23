// Home (design C): "Which doctor do you need?", the dark Today card, specialists, tests, and how to find us.

import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { categories, clinic, doctors, services } from "@/data/clinic";
import { formatTime, opdShort } from "@/lib/schedule";
import { WhosInToday, WhosInTodaySkeleton } from "@/components/WhosInToday";
import { LegacyBookingLink } from "@/components/LegacyBookingLink";
import { DoctorMark } from "@/components/DoctorMark";
import { ChevronRightIcon, MapPinIcon, SearchIcon, ServiceIcon } from "@/components/Icons";

const hours = `${formatTime(clinic.hours.open)} – ${formatTime(clinic.hours.close)}`;

export default function Home() {
  return (
    <>
      <LegacyBookingLink />

      {/* Hero + Today */}
      <section className="mx-auto grid max-w-6xl gap-6 px-5 pt-6 sm:pt-12 lg:grid-cols-[1.15fr_1fr] lg:gap-8 lg:pt-14">
        <div className="flex min-w-0 flex-col justify-center gap-4 sm:gap-5">
          <p className="text-sm font-semibold text-brand sm:text-base">
            Open {hours}
            <span className="hidden sm:inline"> · {clinic.address}</span>
          </p>
          <h1 className="text-[1.75rem] font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            Which doctor do you need?
          </h1>
          <p className="max-w-xl text-muted sm:text-lg">
            Visiting specialists on fixed days, with scans, a lab and a pharmacy under one roof. Consultation ₹
            {clinic.consultationFee}.
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
            <button type="submit" className="min-h-11 shrink-0 rounded-xl bg-ink px-4 font-semibold text-white hover:bg-slate-800">
              Find
            </button>
          </Form>
          <ul aria-label="Browse by speciality" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:flex-wrap">
            <li className="shrink-0">
              <Link href="/doctors" className="inline-flex min-h-11 items-center rounded-full bg-ink px-4 font-semibold text-white">
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

        <section aria-labelledby="today" className="min-w-0">
          <Suspense fallback={<WhosInTodaySkeleton />}>
            <WhosInToday />
          </Suspense>
        </section>
      </section>

      {/* Specialists */}
      <section aria-labelledby="specialists" className="mx-auto max-w-6xl pt-10 sm:pt-14">
        <div className="flex items-center justify-between px-5">
          <h2 id="specialists" className="text-xl font-extrabold tracking-tight sm:text-3xl">
            Specialists
          </h2>
          <Link href="/doctors" className="inline-flex min-h-11 items-center font-semibold text-brand">
            See all
          </Link>
        </div>
        {/* Phones: swipe sideways. Wider screens: a grid. */}
        <ul className="mt-2 flex snap-x scroll-px-5 gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible lg:grid-cols-4">
          {doctors.map((doctor) => {
            const days = opdShort(doctor);
            return (
              <li key={doctor.id} className="w-44 shrink-0 snap-start sm:w-auto">
                <Link
                  href={days ? `/book?doctor=${doctor.id}` : "/doctors"}
                  className="card flex h-full flex-col gap-3 rounded-3xl p-3 hover:ring-2 hover:ring-brand-line sm:p-4"
                >
                  <DoctorMark doctor={doctor} className="h-28 w-full rounded-2xl bg-brand-tint text-4xl text-brand sm:h-36 sm:text-5xl" />
                  <span className="flex flex-col px-1 pb-1 leading-snug">
                    <span className="font-bold sm:text-lg">{doctor.name ?? doctor.speciality}</span>
                    <span className="text-sm text-muted sm:text-base">{doctor.name ? doctor.speciality : "Name to be confirmed"}</span>
                    <span className="pt-1.5 text-sm font-semibold text-brand">{days ?? "Days coming soon"}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Tests and medicines + visit */}
      <section className="mx-auto grid max-w-6xl gap-6 px-5 pb-10 pt-8 sm:pb-16 sm:pt-12 lg:grid-cols-[2fr_1fr] lg:items-end">
        <div className="min-w-0">
          <h2 className="text-xl font-extrabold tracking-tight sm:text-3xl">Tests and medicines</h2>
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

        <Link href="/contact" className="card flex items-center gap-4 rounded-3xl p-4 hover:ring-2 hover:ring-brand-line sm:p-5">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-tint text-brand">
            <MapPinIcon className="size-6" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col leading-snug">
            <span className="font-bold">{clinic.address.replace(/, Sopore$/, "")}</span>
            <span className="text-sm text-muted sm:text-base">
              {clinic.location.name} building, Sopore · Map and directions
            </span>
          </span>
          <ChevronRightIcon className="size-5 shrink-0 text-slate-400" />
        </Link>
      </section>
    </>
  );
}
