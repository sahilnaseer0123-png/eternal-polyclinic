// Home (design v3, "day-first"): hero, "Who sits on <day>" picker, by-appointment doctors,
// three booking steps, tests and medicines, and how to find us. All facts come from data/clinic.ts.

import type { Metadata } from "next";
import Link from "next/link";
import { clinic, services } from "@/data/clinic";
import { DayPicker } from "@/components/DayPicker";
import { ByAppointmentSection } from "@/components/ByAppointmentSection";
import { HeroRightColumn } from "@/components/HeroRightColumn";
import { LegacyBookingLink } from "@/components/LegacyBookingLink";
import { ReceptionPhoto } from "@/components/ClinicPhoto";
import { EmergencyNote } from "@/components/EmergencyNote";
import {
  CalendarCheckIcon,
  GoogleIcon,
  MapPinIcon,
  PhoneIcon,
  ReportIcon,
  ServiceIcon,
  StethoscopeIcon,
  WhatsAppIcon,
} from "@/components/Icons";

function UltrasoundWaveIcon({ className = "size-5" }: { className?: string }) {
  return <ServiceIcon id="ultrasound" className={className} />;
}

const heroHighlights = [
  { lines: ["Visiting", "Specialists"], Icon: StethoscopeIcon },
  { lines: ["Ultrasound", "Scans"], Icon: UltrasoundWaveIcon },
  { lines: ["PDF Lab", "Reports"], Icon: ReportIcon },
  { lines: ["Same-Day", "Booking"], Icon: CalendarCheckIcon },
] as const;

// Every page names its own address for search engines (alternates.canonical); this is "/".
export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function Home() {
  return (
    <>
      <LegacyBookingLink />

      {/* Hero (design v5): white canvas, dotted grid fading in from the right, serif headline, squared CTA */}
      <section className="relative overflow-hidden border-b border-line bg-white">
        <div
          aria-hidden="true"
          className="dot-grid pointer-events-none absolute inset-x-0 bottom-0 top-[42%] opacity-70 [mask-image:linear-gradient(to_bottom,transparent_0%,black_30%,black_70%,transparent_100%)] sm:inset-y-0 sm:left-auto sm:right-0 sm:top-0 sm:w-[70%] sm:[mask-image:linear-gradient(to_left,black_0%,black_35%,transparent_72%)]"
        />
        <div className="hero-mobile-screen relative mx-auto flex w-full max-w-7xl flex-col justify-between gap-2.5 px-5 pt-3.5 sm:justify-start sm:gap-4 sm:px-8 sm:pt-7 sm:pb-12 min-[72rem]:grid min-[72rem]:min-h-[650px] min-[72rem]:grid-cols-[minmax(0,1fr)_336px] min-[72rem]:gap-8 min-[72rem]:px-10 min-[72rem]:pt-11 min-[72rem]:pb-16 xl:min-h-[680px] xl:grid-cols-[minmax(0,1fr)_350px]">
          {/* 1. Top-Left Content Block */}
          <div className="relative z-10 flex min-w-0 flex-col items-start gap-2.5 min-[390px]:gap-3 sm:gap-4 min-[72rem]:gap-5 min-[72rem]:max-w-[36rem] min-[72rem]:pt-2 min-[72rem]:pb-8 xl:max-w-[39rem]">
            {/* Google Rating Pill */}
            <div className="rise flex items-center">
              <a
                href={clinic.googleRating.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-sm border border-line-strong bg-white px-2.5 py-1 text-[11.5px] sm:text-xs font-semibold text-charcoal hover:border-brand transition-colors shrink-0"
                aria-label={`Rated ${clinic.googleRating.score} out of 5 on Google with ${clinic.googleRating.count} reviews`}
              >
                <GoogleIcon className="size-3.5 shrink-0" />
                <span className="font-bold text-ink tabular-nums lining-nums">{clinic.googleRating.score}</span>
                <span className="text-[#F59E0B] text-xs leading-none tracking-tighter" aria-hidden="true">
                  ★★★★★
                </span>
                <span className="text-muted tabular-nums lining-nums">({clinic.googleRating.count})</span>
              </a>
            </div>

            {/* Main Headline (>= 30px mobile, >= 36px tablet, >= 48px desktop) */}
            <h1 className="hero-fade-in max-w-full text-ink text-[clamp(2.05rem,9vw,2.6rem)] leading-[1.06] sm:text-[3rem] sm:leading-[1.05] min-[72rem]:text-[3.5rem] xl:text-[3.85rem]">
              Book a Specialist
              <span className="block">Appointment Today</span>
            </h1>

            {/* Primary CTA Button */}
            <Link
              href="/book"
              className="hero-fade-in group inline-flex min-h-11 sm:min-h-13 items-center justify-center gap-2.5 rounded-md bg-brand px-5 sm:px-6 py-2.5 sm:py-3 text-[1rem] sm:text-[1.0625rem] font-semibold text-white hover:bg-brand-dark transition-all"
            >
              <span>Book Appointment</span>
              <span className="inline-flex size-6 items-center justify-center rounded-sm bg-white/15 text-white transition-transform duration-200 group-hover:translate-x-0.5">
                <span aria-hidden="true" className="text-xs font-bold leading-none">→</span>
              </span>
            </Link>

            {/* 4 Clinic-Accurate Value Proposition Icons */}
            <div className="grid w-full max-w-[26rem] sm:max-w-[32rem] grid-cols-4 gap-1.5 min-[390px]:gap-2 sm:gap-3 pt-0.5">
              {heroHighlights.map(({ lines, Icon }) => (
                <div
                  key={lines.join(" ")}
                  className="flex flex-col items-start gap-1.5 rounded-lg border border-line bg-white/90 p-2 sm:p-2.5"
                >
                  <span className="flex size-8 min-[390px]:size-9 sm:size-10 items-center justify-center rounded-md bg-brand-tint text-brand ring-1 ring-brand-line/70">
                    <Icon className="size-4 min-[390px]:size-4.5 sm:size-5" />
                  </span>
                  <span className="text-[11px] min-[390px]:text-[12px] sm:text-[12.5px] font-medium leading-[1.25] text-charcoal">
                    {lines[0]}
                    <span className="block">{lines[1]}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Centerpiece 3D Sculptural DNA Helix (16:9 WebP + JPG fallback < 200KB) */}
          <div className="pointer-events-none relative z-0 -mx-5 my-auto flex min-h-[142px] max-h-[265px] min-[390px]:min-h-[168px] min-[390px]:max-h-[285px] min-[420px]:min-h-[195px] min-[420px]:max-h-[315px] flex-1 items-center w-[calc(100%+2.5rem)] select-none overflow-hidden [mask-image:linear-gradient(to_right,transparent_0%,black_9%,black_91%,transparent_100%)] sm:block sm:flex-none sm:min-h-0 sm:max-h-none sm:-mx-8 sm:my-0 sm:h-[195px] sm:w-[calc(100%+4rem)] md:h-[215px] min-[72rem]:absolute min-[72rem]:left-[33%] min-[72rem]:top-[-2%] min-[72rem]:mx-0 min-[72rem]:h-auto min-[72rem]:aspect-video min-[72rem]:w-[61%] min-[72rem]:overflow-visible min-[72rem]:-rotate-[16deg] min-[72rem]:[mask-image:linear-gradient(90deg,transparent_0%,black_14%,black_90%,transparent_100%)] xl:left-[34%] xl:top-[-3%] xl:w-[59%]">
            <div className="flex h-full w-full items-center justify-center [mask-image:linear-gradient(to_bottom,transparent_0%,black_18%,black_82%,transparent_100%)] sm:block min-[72rem]:[mask-image:none]">
              <picture className="block h-full w-full">
                <source type="image/webp" media="(min-width: 640px)" srcSet="/photos/dna-helix-1920.webp" />
                <source type="image/webp" srcSet="/photos/dna-helix-800.webp" />
                <img
                  src="/photos/dna-helix-1920.jpg"
                  alt=""
                  aria-hidden="true"
                  width={1920}
                  height={1080}
                  fetchPriority="high"
                  decoding="async"
                  className="h-full w-full scale-[1.18] -rotate-[7deg] object-cover sm:scale-[1.06] sm:-rotate-[4deg] min-[72rem]:scale-100 min-[72rem]:rotate-0 min-[72rem]:object-contain"
                />
              </picture>
            </div>
          </div>

          {/* 3. Right-Side Compact Appointment & Live Clinic Cards */}
          <div className="relative z-10 w-full min-[72rem]:self-end min-[72rem]:pt-46 xl:pt-50">
            <HeroRightColumn />
          </div>
        </div>
      </section>

      <DayPicker />

      {/* Doctors without fixed OPD days (live: follows the admin's schedule changes) */}
      <ByAppointmentSection />

      {/* Tests and medicines */}
      <section aria-labelledby="services" className="bg-white">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-6 sm:py-20">
          <p className="eyebrow text-muted">In the clinic</p>
          <h2 id="services" className="mt-3 text-[2rem] leading-[1.08] text-ink sm:text-5xl">
            Tests and <em>medicines</em>
          </h2>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/services#${s.id}`}
                  className="card card-hover flex h-full items-start gap-4 rounded-2xl p-5"
                >
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-ink ring-1 ring-brand-line/70">
                    <ServiceIcon id={s.id} />
                  </span>
                  <span>
                    <span className="block text-lg font-semibold text-ink">{s.short}</span>
                    <span className="block text-[15px] text-muted">{s.description}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {/* Quick Reports WhatsApp prompt */}
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-line bg-ground p-5">
            <div className="flex items-start sm:items-center gap-3.5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-ink ring-1 ring-brand-line/70">
                <ReportIcon className="size-5" />
              </span>
              <div>
                <strong className="block text-base font-semibold text-ink">
                  Collect Your Reports on WhatsApp
                </strong>
                <p className="text-sm text-muted">
                  No need to travel back to Sopore. WhatsApp or call our lab technician ({clinic.labTechPhoneDisplay}) to receive your digital PDF report.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <a
                href={clinic.reportRequestUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-brand px-4 text-sm font-bold text-white shadow-subtle hover:bg-brand-dark active:translate-y-0.5 transition-all"
              >
                <WhatsAppIcon className="size-4 shrink-0" />
                <span>Get Report</span>
              </a>
              <a
                href={`tel:${clinic.labTechPhone}`}
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-line-strong bg-white px-4 text-sm font-semibold text-ink hover:border-brand transition-colors"
              >
                <PhoneIcon className="size-3.5 shrink-0 text-brand" />
                <span>Call Lab ({clinic.labTechPhoneDisplay})</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Visit */}
      <section aria-labelledby="visit" className="bg-ground border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:px-6 sm:py-20 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="eyebrow text-muted">Visit us</p>
            <h2 id="visit" className="mt-3 text-[2rem] leading-[1.08] text-ink sm:text-5xl">
              Opposite <em>SDH Hospital</em>
            </h2>
            <p className="mt-4 flex items-start gap-2 text-lg font-semibold">
              <MapPinIcon className="mt-1 size-5 shrink-0 text-brand" />
              <span>
                {clinic.address}
                <span className="block text-[15px] font-normal text-muted sm:text-base">{clinic.location.name} building</span>
              </span>
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={clinic.mapUrl}
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-brand px-6 text-base font-bold text-white hover:bg-brand-dark"
              >
                Get directions
              </a>
              <a
                href={`tel:${clinic.phone}`}
                className="inline-flex min-h-12 items-center justify-center rounded-xl border-[1.5px] border-ink px-6 text-base font-bold hover:bg-ink hover:text-white"
              >
                Call {clinic.phoneDisplay}
              </a>
              <a
                href={clinic.locationShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line-strong bg-white px-5 text-base font-bold text-charcoal hover:border-ink hover:text-brand transition-colors"
                title="Forward address and map link to family or drivers on WhatsApp"
              >
                <WhatsAppIcon className="size-4.5 text-ink shrink-0" />
                <span>Share location</span>
              </a>
            </div>

            {/* Google Reviews Card */}
            <div className="mt-6 rounded-2xl border border-line bg-white p-4 sm:p-5 shadow-card">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-ground border border-line">
                    <GoogleIcon className="size-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-xl font-medium tracking-tight text-ink tabular-nums lining-nums">
                        {clinic.googleRating.score}
                      </span>
                      <span className="text-[#F59E0B] text-base leading-none tracking-tight" aria-hidden="true">★★★★★</span>
                      <span className="text-xs font-semibold text-muted">on Google</span>
                    </div>
                    <p className="text-xs text-muted mt-0.5">
                      Based on {clinic.googleRating.count} patient ratings & reviews
                    </p>
                  </div>
                </div>
                <a
                  href={clinic.googleRating.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-line-strong bg-ground px-4 text-xs font-bold uppercase tracking-wider text-charcoal hover:border-brand hover:text-brand transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Review on Google</span>
                  <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>

            <p className="mt-6 text-base text-charcoal">
              <span className="font-bold">Please bring</span> old prescriptions, any test reports, and a list of the medicines you take now.
            </p>
            <EmergencyNote className="mt-4" />
          </div>
          <Link href="/contact" aria-label="Map and directions" className="block overflow-hidden rounded-3xl">
            <ReceptionPhoto className="aspect-[3/2]" sizes="(min-width: 1024px) 560px, 100vw" />
          </Link>
        </div>
      </section>
    </>
  );
}
