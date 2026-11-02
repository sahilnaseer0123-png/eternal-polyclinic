// Home (design v3, "day-first"): night hero, "Who sits on <day>" picker, by-appointment doctors,
// three booking steps, tests and medicines, and how to find us. All facts come from data/clinic.ts.

import type { Metadata } from "next";
import Link from "next/link";
import { clinic, doctors, services } from "@/data/clinic";
import { formatTime } from "@/lib/schedule";
import { DayPicker } from "@/components/DayPicker";
import { TodayCard } from "@/components/TodayCard";
import { LegacyBookingLink } from "@/components/LegacyBookingLink";
import { ReceptionPhoto } from "@/components/ClinicPhoto";
import { WhatsAppPreview } from "@/components/WhatsAppPreview";
import { EmergencyNote } from "@/components/EmergencyNote";
import { CheckIcon, MapPinIcon, PhoneIcon, ServiceIcon } from "@/components/Icons";

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

      {/* Hero */}
      <section className="border-b border-line bg-brand-tint">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-5 py-10 sm:px-6 sm:py-14 lg:grid-cols-[1.15fr_1fr] lg:gap-14 lg:py-16">
          <div>
            <p className="rise eyebrow text-brand">Opposite SDH Hospital, Sopore</p>
            <h1 className="rise rise-2 mt-4 max-w-2xl text-balance text-[3rem] font-light leading-[0.97] tracking-[-0.04em] sm:text-[4.5rem] lg:text-[5rem]">
              Find the day <em className="text-brand">your doctor</em> is in.
            </h1>
            <p className="rise rise-3 mt-5 max-w-lg text-base leading-relaxed text-charcoal sm:text-xl">
              {doctors.length} visiting specialists, one clinic in Sopore. See who sits today, then book on WhatsApp.
            </p>
            <div className="rise rise-3 mt-7 flex flex-wrap gap-3">
              <Link
                href="/book"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-brand px-6 text-base font-bold text-white hover:bg-brand-dark"
              >
                Book a visit
              </Link>
              <a
                href={`tel:${clinic.phone}`}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-[1.5px] border-ink px-6 text-base font-bold hover:bg-ink hover:text-white"
              >
                <PhoneIcon className="size-4" />
                Call {clinic.phoneDisplay}
              </a>
            </div>
            <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-1.5 text-sm font-semibold text-charcoal sm:text-base">
              {facts.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <CheckIcon className="size-4 shrink-0 text-brand" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <TodayCard />
        </div>
      </section>

      <DayPicker />

      {/* Doctors without fixed OPD days */}
      {byAppointment.length > 0 && (
        <section aria-labelledby="by-appointment" className="bg-ground">
          <div className="mx-auto max-w-6xl px-5 pb-12 sm:px-6 sm:pb-20">
            <div className="rounded-3xl bg-sand p-6 sm:p-10">
              <p className="eyebrow text-brand">By appointment</p>
              <h2 id="by-appointment" className="mt-3 text-3xl font-light leading-none tracking-[-0.04em] sm:text-5xl">
                Any day, <em className="text-brand">by appointment</em>
              </h2>
              <p className="mt-3 max-w-xl text-base text-muted">
                These specialists don&rsquo;t sit on fixed days. Call reception to fix a time.
              </p>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {byAppointment.map((d) => (
                  <li key={d.id} className="rounded-2xl bg-white p-5">
                    <h3 className="font-display text-xl font-medium tracking-tight sm:text-2xl">
                      <Link href={`/doctors/${d.id}`} className="hover:text-brand">
                        {d.name ?? d.speciality}
                      </Link>
                    </h3>
                    <p className="font-semibold text-brand">{d.speciality}</p>
                    <p className="text-sm text-muted">{d.credentials ?? d.degree}</p>
                    <a
                      href={`tel:${clinic.phone}`}
                      className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border-[1.5px] border-ink px-4 text-base font-bold hover:bg-ink hover:text-white"
                    >
                      <PhoneIcon className="size-4" />
                      Call {clinic.phoneDisplay}
                    </a>
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
            <p className="eyebrow text-[#BDF1E8]">How booking works</p>
            <h2 id="steps" className="mt-3 text-[2.125rem] font-light leading-none tracking-[-0.04em] sm:text-6xl">
              Three steps. <em>No account.</em>
            </h2>
            <ol className="mt-8 flex flex-col gap-5">
              {steps.map((s) => (
                <li key={s.n} className="flex gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15 font-display text-xl font-medium">
                    {s.n}
                  </span>
                  <span>
                    <span className="block text-lg font-bold">{s.title}</span>
                    <span className="block text-base text-[#D4F5EF]">{s.text}</span>
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
          <h2 id="services" className="mt-3 text-[2.125rem] font-light leading-none tracking-[-0.04em] sm:text-6xl">
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
                    <span className="block text-sm text-muted">{s.description}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Visit */}
      <section aria-labelledby="visit" className="bg-sand">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:px-6 sm:py-20 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="eyebrow text-brand">Visit us</p>
            <h2 id="visit" className="mt-3 text-[2.125rem] font-light leading-none tracking-[-0.04em] sm:text-6xl">
              Opposite <em className="text-brand">SDH Hospital</em>
            </h2>
            <p className="mt-4 flex items-start gap-2 text-lg font-semibold">
              <MapPinIcon className="mt-1 size-5 shrink-0 text-brand" />
              <span>
                {clinic.address}
                <span className="block text-base font-normal text-muted">{clinic.location.name} building</span>
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
