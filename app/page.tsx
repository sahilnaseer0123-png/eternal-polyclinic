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

      {/* Hero: Crisp white architectural canvas with diagonal 3D DNA sculpture */}
      <section className="relative overflow-hidden bg-white">
        <div className="ep-hero-dot-bg pointer-events-none absolute inset-0 z-0 hidden lg:block opacity-60" aria-hidden="true" />
        <canvas className="ep-hero-dots pointer-events-none absolute inset-0 z-0 hidden lg:block h-full w-full" aria-hidden="true" />
        <div className="hero-mobile-screen relative mx-auto flex w-full max-w-7xl flex-col justify-between gap-2.5 px-5 pt-3.5 sm:justify-start sm:gap-4 sm:px-8 sm:pt-7 sm:pb-12 min-[72rem]:grid min-[72rem]:min-h-[650px] min-[72rem]:grid-cols-[minmax(0,1fr)_336px] min-[72rem]:gap-8 min-[72rem]:px-10 min-[72rem]:pt-11 min-[72rem]:pb-16 xl:min-h-[680px] xl:grid-cols-[minmax(0,1fr)_350px]">
          {/* 1. Top-Left Content Block */}
          <div className="relative z-10 flex min-w-0 flex-col items-start gap-2.5 min-[390px]:gap-3 sm:gap-4 min-[72rem]:gap-5 min-[72rem]:max-w-[36rem] min-[72rem]:pt-2 min-[72rem]:pb-8 xl:max-w-[39rem]">
            {/* Google Rating Pill */}
            <div className="rise flex items-center">
              <a
                href={clinic.googleRating.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-ground/90 px-2.5 py-0.5 sm:py-1 text-[11.5px] sm:text-xs font-semibold text-charcoal hover:border-brand-line hover:bg-brand-tint/50 transition-colors shrink-0"
                aria-label={`Rated ${clinic.googleRating.score} out of 5 on Google with ${clinic.googleRating.count} reviews`}
              >
                <GoogleIcon className="size-3.5 shrink-0" />
                <span className="font-bold text-ink tabular-nums lining-nums">{clinic.googleRating.score}</span>
                <span className="text-[#F59E0B] text-xs leading-none tracking-tighter" aria-hidden="true">
                  ★★★★★
                </span>
                <span className="text-muted tabular-nums lining-nums">
                  (<span data-count={clinic.googleRating.count}>{clinic.googleRating.count}</span>)
                </span>
              </a>
            </div>

            {/* Main Headline (>= 30px mobile, >= 36px tablet, >= 48px desktop) */}
            <h1 className="rise rise-1 max-w-full font-sans font-semibold tracking-[-0.036em] text-ink text-[clamp(1.875rem,8.3vw,2.35rem)] leading-[1.08] sm:tracking-[-0.035em] sm:text-[2.65rem] sm:leading-[1.07] min-[72rem]:text-[3.05rem] xl:text-[3.35rem]">
              Book a Specialist
              <span className="block">
                Appointment <span className="ep-mark ep-mark-hero">Today</span>
              </span>
            </h1>

            {/* Primary CTA Button */}
            <Link
              href="/book"
              className="rise rise-2 shadow-elevated group inline-flex min-h-11 sm:min-h-13 items-center justify-center gap-2.5 rounded-xl bg-brand px-5 sm:px-7 py-2.5 sm:py-3 text-[1.0625rem] sm:text-[1.125rem] font-semibold text-white hover:bg-brand-dark transition-all"
            >
              <span>Book Appointment</span>
              <span className="btn-arrow inline-flex size-6 items-center justify-center rounded-lg bg-mint text-ink transition-transform duration-200 group-hover:translate-x-0.5">
                <span aria-hidden="true" className="text-xs font-bold leading-none">→</span>
              </span>
            </Link>

            {/* 4 Clinic-Accurate Value Proposition Icons */}
            <div className="rise rise-3 grid w-full max-w-[26rem] sm:max-w-[32rem] grid-cols-4 gap-1.5 min-[390px]:gap-2 sm:gap-3 pt-0.5">
              {heroHighlights.map(({ lines, Icon }) => (
                <div
                  key={lines.join(" ")}
                  className="flex flex-col items-start gap-1.5 rounded-xl border border-line bg-ground/95 p-2 sm:p-2.5 backdrop-blur-2xs"
                >
                  <span className="flex size-8 min-[390px]:size-9 sm:size-10 items-center justify-center rounded-lg bg-brand-tint text-accent ring-1 ring-brand-line/80">
                    <Icon className="size-4 min-[390px]:size-4.5 sm:size-5" />
                  </span>
                  <span className="text-[11px] min-[390px]:text-[12px] sm:text-[12.5px] font-semibold leading-[1.2] tracking-[-0.01em] text-charcoal">
                    {lines[0]}
                    <span className="block">{lines[1]}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Centerpiece 3D Sculptural DNA Helix (16:9 WebP + JPG fallback < 200KB) */}
          <div className="ep-dna-parallax pointer-events-none relative z-0 -mx-5 my-auto flex min-h-[142px] max-h-[265px] min-[390px]:min-h-[168px] min-[390px]:max-h-[285px] min-[420px]:min-h-[195px] min-[420px]:max-h-[315px] flex-1 items-center w-[calc(100%+2.5rem)] select-none overflow-hidden [mask-image:linear-gradient(to_right,transparent_0%,black_9%,black_91%,transparent_100%)] sm:block sm:flex-none sm:min-h-0 sm:max-h-none sm:-mx-8 sm:my-0 sm:h-[195px] sm:w-[calc(100%+4rem)] md:h-[215px] min-[72rem]:absolute min-[72rem]:left-[33%] min-[72rem]:top-[-2%] min-[72rem]:mx-0 min-[72rem]:h-auto min-[72rem]:aspect-video min-[72rem]:w-[61%] min-[72rem]:overflow-visible min-[72rem]:-rotate-[16deg] min-[72rem]:[mask-image:linear-gradient(90deg,transparent_0%,black_14%,black_90%,transparent_100%)] xl:left-[34%] xl:top-[-3%] xl:w-[59%]">
            <div className="relative flex h-full w-full items-center justify-center [mask-image:linear-gradient(to_bottom,transparent_0%,black_18%,black_82%,transparent_100%)] sm:block min-[72rem]:[mask-image:none]">
              {/* Sapphire-cyan bioluminescent aura behind DNA helix */}
              <div
                aria-hidden="true"
                className="ep-dna-aura-glow pointer-events-none absolute inset-[8%] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.22)_0%,rgba(56,189,248,0.12)_45%,transparent_72%)] blur-2xl"
              />
              {/* Animated helical molecular pulse streams */}
              <svg
                viewBox="0 0 800 450"
                fill="none"
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-10 h-full w-full opacity-75 mix-blend-multiply"
              >
                <path
                  d="M-20 315 C 140 215, 250 345, 410 225 C 565 110, 670 245, 830 135"
                  stroke="#2563EB"
                  strokeWidth="2.2"
                  strokeOpacity="0.45"
                  strokeLinecap="round"
                  className="ep-dna-stream-line"
                />
                <path
                  d="M-20 145 C 145 250, 260 115, 415 235 C 570 355, 675 190, 830 295"
                  stroke="#0EA5E9"
                  strokeWidth="2"
                  strokeOpacity="0.42"
                  strokeLinecap="round"
                  className="ep-dna-stream-line"
                  style={{ animationDelay: "-2.7s" }}
                />
                <circle cx="215" cy="245" r="4" fill="#1D4ED8" fillOpacity="0.4" />
                <circle cx="412" cy="230" r="4.5" fill="#0EA5E9" fillOpacity="0.5" />
                <circle cx="620" cy="210" r="4" fill="#1D4ED8" fillOpacity="0.4" />
              </svg>
              <picture className="ep-dna-floater relative z-0 block h-full w-full">
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
                  className="ep-dna-img-motion h-full w-full scale-[1.18] -rotate-[7deg] object-cover sm:scale-[1.06] sm:-rotate-[4deg] min-[72rem]:scale-100 min-[72rem]:rotate-0 min-[72rem]:object-contain"
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
          <div className="reveal">
            <p className="eyebrow text-muted">In the clinic</p>
            <h2 id="services" className="mt-3 text-[2rem] font-semibold leading-[1.08] tracking-[-0.035em] text-ink sm:text-5xl">
              Tests and <em className="ep-mark">medicines</em>
            </h2>
          </div>
          <ul className="reveal-group mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <li key={s.id} className="reveal" data-draw="">
                <Link
                  href={`/services#${s.id}`}
                  className="card card-hover flex h-full items-start gap-4 rounded-2xl p-5"
                >
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-accent ring-1 ring-brand-line/80">
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
          <div className="reveal mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-line bg-ground p-5">
            <div className="flex items-start sm:items-center gap-3.5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-accent ring-1 ring-brand-line/80">
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
          <div className="reveal">
            <p className="eyebrow text-muted">Visit us</p>
            <h2 id="visit" className="mt-3 text-[2rem] font-semibold leading-[1.08] tracking-[-0.035em] text-ink sm:text-5xl">
              Opposite <em className="ep-mark">SDH Hospital</em>
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
          <Link href="/contact" aria-label="Map and directions" className="reveal block overflow-hidden rounded-3xl">
            <ReceptionPhoto className="aspect-[3/2] transition-transform duration-500 ease-out hover:scale-[1.03]" sizes="(min-width: 1024px) 560px, 100vw" />
          </Link>
        </div>
      </section>
    </>
  );
}
