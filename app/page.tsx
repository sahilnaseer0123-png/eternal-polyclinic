// Home (design v3, "day-first"): night hero, "Who sits on <day>" picker, by-appointment doctors,
// three booking steps, tests and medicines, and how to find us. All facts come from data/clinic.ts.

import type { Metadata } from "next";
import Link from "next/link";
import { clinic, doctors, services } from "@/data/clinic";
import { formatTime } from "@/lib/schedule";
import { DayPicker } from "@/components/DayPicker";
import { HeroRightColumn } from "@/components/HeroRightColumn";
import { LegacyBookingLink } from "@/components/LegacyBookingLink";
import { ReceptionPhoto } from "@/components/ClinicPhoto";
import { WhatsAppPreview } from "@/components/WhatsAppPreview";
import { EmergencyNote } from "@/components/EmergencyNote";
import { CheckIcon, GoogleIcon, MapPinIcon, PhoneIcon, ReportIcon, ServiceIcon, WhatsAppIcon } from "@/components/Icons";

// Every page names its own address for search engines (alternates.canonical); this is "/".
export const metadata: Metadata = { alternates: { canonical: "/" } };

const hours = `${formatTime(clinic.hours.open)} – ${formatTime(clinic.hours.close)}`;
const byAppointment = doctors.filter((d) => d.opd.length === 0);

const facts = ["No registration charge", "No account needed", `Open daily, ${hours}`];

const steps = [
  { n: "1", title: "Pick a day", text: "See which specialists sit on the day that suits you." },
  { n: "2", title: "Choose a time", text: "Pick a doctor, a date and a time. We ask for your name and number only." },
  { n: "3", title: "Send on WhatsApp", text: "Your request opens in WhatsApp. Reception calls you to confirm." },
];

export default function Home() {
  return (
    <>
      <LegacyBookingLink />

      {/* Hero: Crisp white architectural canvas with diagonal 3D DNA sculpture */}
      <section className="relative overflow-hidden bg-white">
        <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 pt-6 pb-10 sm:px-8 sm:pt-10 sm:pb-14 min-[72rem]:grid min-[72rem]:min-h-[630px] min-[72rem]:grid-cols-[minmax(0,1fr)_336px] min-[72rem]:gap-8 min-[72rem]:px-10 min-[72rem]:pt-11 min-[72rem]:pb-18 xl:min-h-[660px] xl:grid-cols-[minmax(0,1fr)_350px]">
          {/* 1. Top-Left Content Block */}
          <div className="relative z-10 flex min-w-0 flex-col items-start gap-4 sm:gap-5 min-[72rem]:max-w-[35rem] min-[72rem]:pt-3 min-[72rem]:pb-20 xl:max-w-[38rem]">
            {/* Location & Google Rating */}
            <div className="rise flex flex-wrap items-center gap-2 sm:gap-2.5">
              <p className="eyebrow text-[#3E504B] shrink-0">Opposite SDH Hospital, Sopore</p>
              <span className="text-[#D4DCD8] hidden sm:inline" aria-hidden="true">·</span>
              <a
                href={clinic.googleRating.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#E4EAE6] bg-[#F7F9F7] px-2.5 py-0.5 text-xs font-semibold text-charcoal hover:border-[#C5D8CD] hover:bg-[#EFF5EE] transition-all shrink-0"
                aria-label={`Rated ${clinic.googleRating.score} out of 5 on Google with ${clinic.googleRating.count} reviews`}
              >
                <GoogleIcon className="size-3.5 shrink-0" />
                <span className="font-bold text-ink tabular-nums lining-nums">{clinic.googleRating.score}</span>
                <span className="text-[#F59E0B] text-xs leading-none tracking-tighter" aria-hidden="true">★★★★★</span>
                <span className="text-muted tabular-nums lining-nums">({clinic.googleRating.count})</span>
              </a>
            </div>

            {/* Clean Modern Two-Line Sans Headline */}
            <h1 className="rise rise-2 max-w-full font-sans font-semibold tracking-[-0.035em] text-[#171D1B] text-[clamp(1.85rem,7.5vw,2.5rem)] leading-[1.08] sm:text-[2.85rem] min-[72rem]:text-[2.95rem] xl:text-[3.3rem]">
              The patient comes
              <span className="block">before everything else.</span>
            </h1>

            {/* Concise Subtext */}
            <p className="rise rise-3 max-w-[24rem] text-[0.95rem] leading-relaxed text-[#586560] sm:text-[1rem]">
              Visiting specialists, one clinic in Sopore. See who sits today, then book on WhatsApp.
            </p>

            {/* Primary & Secondary CTAs */}
            <div className="rise rise-3 flex flex-col sm:flex-row gap-3 w-full sm:w-auto pt-0.5">
              <Link
                href="/book"
                className="inline-flex min-h-12 w-full sm:w-auto items-center justify-center rounded-xl bg-[#202624] px-6 text-[0.95rem] font-semibold text-white hover:bg-brand transition-all active:scale-[0.99]"
              >
                Book a visit
              </Link>
              <a
                href={`tel:${clinic.phone}`}
                className="inline-flex min-h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-[#D5DDD9] bg-white/95 px-5 text-[0.95rem] font-semibold text-[#171D1B] hover:border-[#202624] hover:bg-[#F7F9F8] transition-all active:scale-[0.99]"
              >
                <PhoneIcon className="size-4 shrink-0 text-brand" />
                Call {clinic.phoneDisplay}
              </a>
            </div>

            {/* Subtle Trust Row (constrained width on desktop so bottom-center corridor stays open for DNA) */}
            <ul className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1 text-xs sm:text-[0.8125rem] font-medium text-[#52605B] min-[72rem]:max-w-[21rem]">
              {facts.map((f) => (
                <li key={f} className="flex items-center gap-1.5">
                  <CheckIcon className="size-3.5 shrink-0 text-brand" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 2. Centerpiece 3D Sculptural DNA Helix */}
          <div className="pointer-events-none relative z-0 -mx-5 my-1 aspect-[1376/768] w-[calc(100%+2.5rem)] select-none sm:-mx-8 sm:w-[calc(100%+4rem)] min-[72rem]:absolute min-[72rem]:left-[27%] min-[72rem]:top-[-3%] min-[72rem]:mx-0 min-[72rem]:my-0 min-[72rem]:w-[67%] min-[72rem]:-rotate-[16deg] xl:left-[28%] xl:top-[-4%] xl:w-[65%]">
            <picture>
              <source media="(min-width: 640px)" srcSet="/photos/dna-helix-1376.webp" />
              <img
                src="/photos/dna-helix-800.webp"
                alt=""
                aria-hidden="true"
                width={1376}
                height={768}
                fetchPriority="high"
                decoding="async"
                className="h-full w-full object-contain min-[72rem]:[mask-image:linear-gradient(90deg,transparent_0%,black_12%,black_90%,transparent_100%)]"
              />
            </picture>
          </div>

          {/* 3. Right-Side Compact Appointment & Live Clinic Cards */}
          <div className="relative z-10 w-full min-[72rem]:self-end min-[72rem]:pt-46 xl:pt-50">
            <HeroRightColumn />
          </div>
        </div>
      </section>

      <DayPicker />

      {/* Doctors without fixed OPD days */}
      {byAppointment.length > 0 && (
        <section aria-labelledby="by-appointment" className="bg-ground">
          <div className="mx-auto max-w-6xl px-5 pb-12 sm:px-6 sm:pb-20">
            <div className="rounded-3xl bg-sand p-6 sm:p-10">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                  <p className="eyebrow text-brand">By appointment</p>
                  <h2 id="by-appointment" className="mt-3 text-3xl font-normal leading-none tracking-[-0.025em] sm:text-5xl">
                    Any day, <em className="text-brand">by appointment</em>
                  </h2>
                  <p className="mt-3 max-w-xl text-base text-muted">
                    These specialists don&rsquo;t sit on fixed days. Call reception to fix a time.
                  </p>
                </div>
                <a
                  href={`tel:${clinic.phone}`}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white hover:bg-brand-dark transition-colors self-start sm:self-auto shrink-0 shadow-xs"
                >
                  <PhoneIcon className="size-4 shrink-0" />
                  Call {clinic.phoneDisplay}
                </a>
              </div>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {byAppointment.map((d) => (
                  <li key={d.id} className="flex flex-col justify-between rounded-2xl bg-white p-5 shadow-xs">
                    <div>
                      <h3 className="font-display text-xl font-medium tracking-tight sm:text-2xl">
                        <Link href={`/doctors/${d.id}`} className="hover:text-brand transition-colors">
                          {d.name ?? d.speciality}
                        </Link>
                      </h3>
                      <p className="font-semibold text-brand">{d.speciality}</p>
                      <p className="text-[15px] text-muted">{d.credentials ?? d.degree}</p>
                    </div>
                    <div className="mt-5 pt-3.5 border-t border-line/70 flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted">By appointment only</span>
                      <Link
                        href={`/doctors/${d.id}`}
                        className="inline-flex items-center gap-1 text-sm font-bold text-brand hover:text-brand-dark transition-colors"
                      >
                        View profile <span aria-hidden="true">→</span>
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* Three steps */}
      <section aria-labelledby="steps" className="bg-brand text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:px-6 sm:py-20 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <p className="eyebrow text-mint">How booking works</p>
            <h2 id="steps" className="mt-3 text-[2.125rem] font-normal leading-none tracking-[-0.025em] sm:text-6xl">
              Three steps. <em>No account.</em>
            </h2>
            <ol className="mt-8 flex flex-col gap-5">
              {steps.map((s) => (
                <li key={s.n} className="flex gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15 font-display text-xl font-medium tabular-nums lining-nums">
                    {s.n}
                  </span>
                  <span>
                    <span className="block text-lg font-bold">{s.title}</span>
                    <span className="block text-base text-mint/90">{s.text}</span>
                  </span>
                </li>
              ))}
            </ol>
            <Link
              href="/book"
              className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-6 text-base font-bold text-brand hover:bg-sand"
            >
              Book a visit
            </Link>
          </div>
          <WhatsAppPreview className="mx-auto w-full max-w-sm" />
        </div>
      </section>

      {/* Tests and medicines */}
      <section aria-labelledby="services" className="bg-ground">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-6 sm:py-20">
          <p className="eyebrow text-brand">In the clinic</p>
          <h2 id="services" className="mt-3 text-[2.125rem] font-normal leading-none tracking-[-0.025em] sm:text-6xl">
            Tests and <em className="text-brand">medicines</em>
          </h2>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/services#${s.id}`}
                  className="card card-hover flex h-full items-start gap-4 rounded-2xl p-5"
                >
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand">
                    <ServiceIcon id={s.id} />
                  </span>
                  <span>
                    <span className="block text-lg font-bold">{s.short}</span>
                    <span className="block text-[15px] text-muted">{s.description}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {/* Quick Reports WhatsApp prompt */}
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-brand-line/70 bg-brand-tint/60 p-5">
            <div className="flex items-start sm:items-center gap-3.5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-subtle">
                <ReportIcon className="size-5" />
              </span>
              <div>
                <strong className="block text-base font-bold text-ink">
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
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-[#25D366] px-4 text-sm font-bold text-white shadow-subtle hover:bg-[#20ba59] active:translate-y-0.5 transition-all"
              >
                <WhatsAppIcon className="size-4 shrink-0" />
                <span>Get Report</span>
              </a>
              <a
                href={`tel:${clinic.labTechPhone}`}
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-line-strong bg-white px-4 text-sm font-bold text-ink hover:text-brand hover:border-brand transition-colors"
              >
                <PhoneIcon className="size-3.5 shrink-0 text-brand" />
                <span>Call Lab ({clinic.labTechPhoneDisplay})</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Visit */}
      <section aria-labelledby="visit" className="bg-sand">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:px-6 sm:py-20 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="eyebrow text-brand">Visit us</p>
            <h2 id="visit" className="mt-3 text-[2.125rem] font-normal leading-none tracking-[-0.025em] sm:text-6xl">
              Opposite <em className="text-brand">SDH Hospital</em>
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
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line-strong bg-white px-5 text-base font-bold text-charcoal hover:border-[#25D366] hover:text-brand transition-colors"
                title="Forward address and map link to family or drivers on WhatsApp"
              >
                <WhatsAppIcon className="size-4.5 text-[#25D366] shrink-0" />
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
