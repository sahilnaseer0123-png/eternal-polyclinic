// Home (design v3, "day-first"): hero, "Who sits on <day>" picker, by-appointment doctors,
// three booking steps, tests and medicines, and how to find us. All facts come from data/clinic.ts.

import type { Metadata } from "next";
import Link from "next/link";
import { clinic, services } from "@/data/clinic";
import { DayPicker } from "@/components/DayPicker";
import { ByAppointmentSection } from "@/components/ByAppointmentSection";
import { HeroRightColumn } from "@/components/HeroRightColumn";
import { HeroClinicalArt } from "@/components/HeroClinicalArt";
import { LegacyBookingLink } from "@/components/LegacyBookingLink";
import { ReceptionPhoto } from "@/components/ClinicPhoto";
import { EmergencyNote } from "@/components/EmergencyNote";
import {
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

function PharmacyIcon({ className = "size-5" }: { className?: string }) {
  return <ServiceIcon id="pharmacy" className={className} />;
}

const heroHighlights = [
  { lines: ["Visiting", "Specialists"], href: "#days", Icon: StethoscopeIcon },
  { lines: ["Ultrasound", "Scans"], href: "/services#ultrasound", Icon: UltrasoundWaveIcon },
  { lines: ["PDF Lab", "Reports"], href: "/services#digital-reports", Icon: ReportIcon },
  { lines: ["In-House", "Pharmacy"], href: "/services#pharmacy", Icon: PharmacyIcon },
] as const;

// Every page names its own address for search engines (alternates.canonical); this is "/".
export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function Home() {
  return (
    <>
      <LegacyBookingLink />

      {/* Hero: Crisp white architectural canvas with isometric Clinical & Live ECG illustration */}
      <section className="relative overflow-hidden bg-white">
        <div className="ep-hero-dot-bg pointer-events-none absolute inset-0 z-0 opacity-45 sm:opacity-60" aria-hidden="true" />
        <canvas className="ep-hero-dots pointer-events-none absolute inset-0 z-0 hidden lg:block h-full w-full" aria-hidden="true" />
        <div className="hero-mobile-screen relative mx-auto flex w-full max-w-7xl flex-col justify-start gap-3 px-5 pt-4 sm:gap-4 sm:px-8 sm:pt-7 sm:pb-12 min-[72rem]:grid min-[72rem]:min-h-[650px] min-[72rem]:grid-cols-[minmax(0,1fr)_336px] min-[72rem]:gap-8 min-[72rem]:px-10 min-[72rem]:pt-11 min-[72rem]:pb-16 xl:min-h-[680px] xl:grid-cols-[minmax(0,1fr)_350px]">
          {/* 1. Top-Left Content Block */}
          <div className="relative z-10 flex min-w-0 flex-col items-start gap-3 sm:gap-4 min-[72rem]:gap-5 min-[72rem]:max-w-[36rem] min-[72rem]:pt-2 min-[72rem]:pb-8 xl:max-w-[39rem]">
            {/* Main Headline (>= 30px mobile, >= 36px tablet, >= 48px desktop) */}
            <h1 className="rise rise-1 max-w-full font-sans font-semibold tracking-[-0.036em] text-ink text-[clamp(1.85rem,8.2vw,2.35rem)] leading-[1.08] sm:tracking-[-0.035em] sm:text-[2.65rem] sm:leading-[1.07] min-[72rem]:text-[3.05rem] xl:text-[3.35rem]">
              Book a Specialist
              <span className="block">
                Appointment <span className="ep-mark ep-mark-hero">Today</span>
              </span>
            </h1>

            {/* Primary CTA Button */}
            <div className="rise rise-2">
              <Link
                href="/book"
                className="shadow-elevated group inline-flex min-h-12 sm:min-h-13 items-center justify-center gap-2.5 rounded-xl bg-brand px-5.5 sm:px-7 py-2.5 sm:py-3 text-base min-[380px]:text-[1.0625rem] sm:text-[1.125rem] font-semibold text-white hover:bg-brand-dark transition-all"
              >
                <span>Book Appointment</span>
                <span className="btn-arrow inline-flex size-6 items-center justify-center rounded-lg bg-mint text-ink transition-transform duration-200 group-hover:translate-x-0.5">
                  <span aria-hidden="true" className="text-xs font-bold leading-none">→</span>
                </span>
              </Link>
            </div>

            {/* 4 Interactive Clinic-Accurate Value Proposition Shortcuts */}
            <div className="rise rise-3 grid w-full max-w-[26rem] sm:max-w-[32rem] grid-cols-4 gap-1.5 min-[390px]:gap-2 sm:gap-3 pt-0.5">
              {heroHighlights.map(({ lines, href, Icon }) => (
                <Link
                  key={lines.join(" ")}
                  href={href}
                  className="group flex flex-col items-start gap-1.5 rounded-xl border border-line bg-ground/95 p-2 sm:p-2.5 backdrop-blur-2xs hover:border-brand-line hover:bg-brand-tint/40 transition-colors"
                >
                  <span className="flex size-8 min-[390px]:size-9 sm:size-10 items-center justify-center rounded-lg bg-brand-tint text-accent ring-1 ring-brand-line/80 group-hover:scale-105 transition-transform">
                    <Icon className="size-4 min-[390px]:size-4.5 sm:size-5" />
                  </span>
                  <span className="text-[10px] min-[375px]:text-[11px] min-[390px]:text-[11.5px] sm:text-[12.5px] font-semibold leading-[1.18] tracking-[-0.01em] text-charcoal group-hover:text-ink">
                    {lines[0]}
                    <span className="block">{lines[1]}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* 2. Centerpiece Isometric Clinical & Live ECG Vector Illustration */}
          <div
            data-hero-art=""
            className="ep-hero-art pointer-events-none relative z-0 mx-auto my-0 flex w-full max-w-[34rem] items-center justify-center select-none sm:my-4 min-[72rem]:absolute min-[72rem]:left-[34%] min-[72rem]:top-[3%] min-[72rem]:mx-0 min-[72rem]:my-0 min-[72rem]:max-w-none min-[72rem]:w-[58%] xl:left-[35%] xl:top-[2%] xl:w-[56%]"
          >
            <HeroClinicalArt />
          </div>

          {/* 3. Right-Side Compact Appointment & Live Clinic Cards (tablet & desktop) */}
          <div className="hidden sm:block relative z-10 w-full min-[72rem]:self-end min-[72rem]:pt-46 xl:pt-50">
            <HeroRightColumn />
          </div>
        </div>
      </section>

      <DayPicker />

      {/* Doctors without fixed OPD days (live: follows the admin's schedule changes) */}
      <ByAppointmentSection />

      {/* Tests and medicines */}
      <section aria-labelledby="services" className="bg-white">
        <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6 sm:py-20">
          <div className="reveal">
            <p className="eyebrow text-muted">In the clinic</p>
            <h2 id="services" className="mt-2 sm:mt-3 text-[2rem] font-semibold leading-[1.08] tracking-[-0.035em] text-ink sm:text-5xl">
              Tests and <em className="ep-mark">medicines</em>
            </h2>
          </div>
          <ul className="reveal-group mt-5 sm:mt-8 grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
            {services.map((s) => (
              <li key={s.id} className="reveal" data-draw="">
                <Link
                  href={`/services#${s.id}`}
                  className="card card-hover flex h-full flex-col sm:flex-row items-start gap-2.5 sm:gap-4 rounded-2xl p-3.5 sm:p-5"
                >
                  <span className="flex size-10 sm:size-12 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-accent ring-1 ring-brand-line/80">
                    <ServiceIcon id={s.id} className="size-5 sm:size-6" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-base sm:text-lg font-semibold leading-snug text-ink">{s.short}</span>
                    <span className="mt-0.5 block line-clamp-2 sm:line-clamp-none text-xs sm:text-[15px] leading-snug text-muted">{s.description}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {/* Quick Reports WhatsApp prompt */}
          <div className="reveal mt-4 sm:mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 rounded-2xl border border-line bg-ground p-4 sm:p-5">
            <div className="flex items-start sm:items-center gap-3 sm:gap-3.5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-accent ring-1 ring-brand-line/80">
                <ReportIcon className="size-5" />
              </span>
              <div>
                <strong className="block text-sm sm:text-base font-semibold text-ink">
                  Collect Your Reports on WhatsApp
                </strong>
                <p className="text-xs sm:text-sm text-muted">
                  No need to travel back to Sopore. WhatsApp or call our lab technician ({clinic.labTechPhoneDisplay}) to receive your digital PDF report.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <a
                href={clinic.reportRequestUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-brand px-4 text-sm font-bold text-white shadow-subtle hover:bg-brand-dark active:translate-y-0.5 transition-all"
              >
                <WhatsAppIcon className="size-4 shrink-0" />
                <span>Get Report</span>
              </a>
              <a
                href={`tel:${clinic.labTechPhone}`}
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-line-strong bg-white px-4 text-sm font-semibold text-ink hover:border-brand transition-colors"
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
        <div className="mx-auto grid max-w-6xl gap-5 sm:gap-8 px-5 py-8 sm:px-6 sm:py-20 lg:grid-cols-2 lg:items-center">
          <div className="reveal">
            <p className="eyebrow text-muted">Visit us</p>
            <h2 id="visit" className="mt-2 sm:mt-3 text-[2rem] font-semibold leading-[1.08] tracking-[-0.035em] text-ink sm:text-5xl">
              Opposite <em className="ep-mark">SDH Hospital</em>
            </h2>
            <p className="mt-3 sm:mt-4 flex items-start gap-2 text-base sm:text-lg font-semibold">
              <MapPinIcon className="mt-1 size-5 shrink-0 text-brand" />
              <span>
                {clinic.address}
                <span className="block text-sm sm:text-base font-normal text-muted">{clinic.location.name} building</span>
              </span>
            </p>
            <div className="mt-4 sm:mt-6 grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:gap-3">
              <a
                href={clinic.mapUrl}
                className="col-span-2 sm:col-span-1 inline-flex min-h-12 items-center justify-center rounded-xl bg-brand px-6 text-base font-bold text-white hover:bg-brand-dark"
              >
                Get directions
              </a>
              <a
                href={`tel:${clinic.phone}`}
                className="inline-flex min-h-12 items-center justify-center rounded-xl border-[1.5px] border-ink px-3 sm:px-6 text-sm sm:text-base font-bold hover:bg-ink hover:text-white whitespace-nowrap"
              >
                Call {clinic.phoneDisplay}
              </a>
              <a
                href={clinic.locationShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-1.5 sm:gap-2 rounded-xl border border-line-strong bg-white px-3 sm:px-5 text-sm sm:text-base font-bold text-charcoal hover:border-ink hover:text-brand transition-colors whitespace-nowrap"
                title="Forward address and map link to family or drivers on WhatsApp"
              >
                <WhatsAppIcon className="size-4 sm:size-4.5 text-ink shrink-0" />
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
                  className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-line-strong bg-ground px-4 text-xs font-bold uppercase tracking-wider text-charcoal hover:border-brand hover:text-brand transition-colors whitespace-nowrap shrink-0"
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
          <Link href="/contact" aria-label="Map and directions" className="reveal block overflow-hidden rounded-3xl">
            <ReceptionPhoto className="aspect-[3/2] transition-transform duration-500 ease-out hover:scale-[1.03]" sizes="(min-width: 1024px) 560px, 100vw" />
          </Link>
        </div>
      </section>
    </>
  );
}
