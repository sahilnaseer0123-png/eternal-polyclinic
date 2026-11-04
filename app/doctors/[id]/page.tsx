// One page per doctor (/doctors/akash): details, the days they sit, Book or Call, and Share.
// Built at build time from data/clinic.ts; nothing here depends on today's date.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { clinic, doctors } from "@/data/clinic";
import { opdSummary } from "@/lib/schedule";
import { DoctorSittings } from "@/components/DoctorSittings";
import { DoctorMark } from "@/components/DoctorMark";
import { DoctorLiveBadge } from "@/components/DoctorLiveBadge";
import { ShareButton } from "@/components/ShareButton";
import { NextAvailable } from "@/components/NextAvailable";
import { EmergencyNote } from "@/components/EmergencyNote";
import { CategoryIcon, CheckIcon, ChevronRightIcon, HospitalIcon, PhoneIcon } from "@/components/Icons";
import { doctorBreadcrumbs, doctorSchema, jsonLd } from "@/lib/structured-data";

export function generateStaticParams() {
  return doctors.map((d) => ({ id: d.id }));
}

const find = (id: string) => doctors.find((d) => d.id === id);
const title = (d: (typeof doctors)[number]) => d.name ?? d.speciality;

export async function generateMetadata({ params }: PageProps<"/doctors/[id]">): Promise<Metadata> {
  const doctor = find((await params).id);
  if (!doctor) return {};
  const days = opdSummary(doctor);
  return {
    alternates: { canonical: `/doctors/${doctor.id}` },
    title: doctor.name ? `${doctor.name}, ${doctor.speciality}` : doctor.speciality,
    description: `${title(doctor)} at ${clinic.name}, Sopore (North Kashmir). ${days ? `Sits on ${days}.` : (doctor.availability ? `${doctor.availability}.` : `Call ${clinic.phoneDisplay} to confirm timings.`)}`,
  };
}

export default async function DoctorPage({ params }: PageProps<"/doctors/[id]">) {
  const doctor = find((await params).id);
  if (!doctor) notFound();
  const others = doctors.filter((d) => d.id !== doctor.id);
  // For search engines: who this doctor is and where they practise, plus Home > Doctors > this page.
  const schema = [doctorSchema(doctor), doctorBreadcrumbs(doctor)].filter(Boolean);

  return (
    <div className="mx-auto max-w-6xl px-5 pb-24 pt-5 sm:pb-16 sm:pt-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <Link href="/doctors" className="inline-flex min-h-11 items-center gap-1 font-semibold text-brand hover:underline">
        <ChevronRightIcon className="size-4 rotate-180" /> All doctors
      </Link>

      <div className="mt-3 grid items-start gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-8">
        {/* Who */}
        <section className="rise card flex flex-col gap-4 rounded-3xl p-5 sm:flex-row sm:items-start sm:gap-6 sm:p-8">
          <DoctorMark doctor={doctor} className="size-20 shrink-0 rounded-full text-4xl sm:size-28 sm:text-5xl lg:size-24 lg:text-4xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-tint px-3 py-1 text-xs font-semibold text-brand">
                <CategoryIcon category={doctor.category} className="size-3.5" />
                {doctor.categoryLabel}
              </span>
              {doctor.opd.length > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 border border-brand/20 px-3 py-1 text-xs font-bold text-brand">
                  <span className="size-1.5 rounded-full bg-brand animate-pulse" />
                  <NextAvailable
                    doctorId={doctor.id}
                    prefix="Next: "
                    fallback="Fixed weekly OPD"
                    short
                    className="tabular-nums lining-nums"
                  />
                </span>
              )}
              {doctor.experienceYears && (
                <span className="inline-flex items-center rounded-full bg-sand px-3 py-1 text-xs font-semibold text-charcoal">
                  {doctor.experienceYears}+ Yrs Exp.
                </span>
              )}
              <span className="inline-flex items-center rounded-full bg-sand px-3 py-1 text-xs font-semibold text-charcoal">
                No registration fee
              </span>
              <DoctorLiveBadge doctorId={doctor.id} />
            </div>

            <h1 className="mt-3 text-[2rem] font-semibold leading-[1.08] tracking-[-0.035em] [overflow-wrap:anywhere] sm:text-5xl text-ink font-display">
              {title(doctor)}
            </h1>
            <p className="mt-1 text-base font-semibold text-brand">
              {doctor.name ? doctor.speciality : "Specialist Consultant"}
              {doctor.degree && ` · ${doctor.degree}`}
            </p>
            {doctor.designation && (
              <p className="mt-2 text-sm font-semibold text-charcoal flex items-center gap-1.5">
                <HospitalIcon className="size-4 shrink-0 text-brand" />
                <span>{doctor.designation}</span>
              </p>
            )}
            {doctor.credentials && (
              <p className="mt-1.5 text-[15px] text-muted leading-relaxed">
                {doctor.credentials}
              </p>
            )}
          </div>
        </section>

        {/* When, and how to book */}
        <section aria-labelledby="when" className="rise rise-2 card flex flex-col justify-between gap-5 rounded-3xl p-5 sm:p-7">
          <div>
            <h2 id="when" className="eyebrow text-muted">
              Sits at the clinic
            </h2>

            <DoctorSittings doctor={doctor} />

            {doctor.opd.length > 0 && (
              <div className="mt-4 rounded-2xl bg-ground border border-line p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="eyebrow flex items-center gap-2 text-ink">
                    <span className="size-2 rounded-full bg-[#22A05B] animate-pulse" />
                    Next Available Sitting
                  </p>
                  <span className="rounded-full bg-brand-tint px-2.5 py-0.5 text-[11px] font-bold text-ink ring-1 ring-brand-line/70">
                    Live Schedule
                  </span>
                </div>
                <p className="mt-2 text-base sm:text-lg font-bold text-ink">
                  <NextAvailable
                    doctorId={doctor.id}
                    prefix=""
                    full
                    fallback={opdSummary(doctor) ?? "Call reception for schedule"}
                    className="tabular-nums lining-nums text-brand"
                  />
                </p>
                <p className="mt-1 text-xs text-muted">
                  {clinic.whatsappAutoConfirm
                    ? "Book online: your slot and token are confirmed instantly on WhatsApp."
                    : "Book online: your slot and token are confirmed instantly on screen."}
                </p>
              </div>
            )}

          </div>

          <div className="grid gap-2.5 pt-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {doctor.opd.length > 0 ? (
              <>
                <Link
                  href={`/book?doctor=${doctor.id}`}
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-brand px-5 text-base font-bold text-white hover:bg-brand-dark"
                >
                  Book this doctor
                </Link>
                <a
                  href={`tel:${clinic.phone}`}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-[1.5px] border-ink px-5 text-base font-bold hover:bg-ink hover:text-white"
                >
                  <PhoneIcon className="size-4" /> Call {clinic.phoneDisplay}
                </a>
              </>
            ) : (
              <>
                <a
                  href={`tel:${clinic.phone}`}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-base font-bold text-white hover:bg-brand-dark"
                >
                  <PhoneIcon className="size-4" /> Call {clinic.phoneDisplay}
                </a>
                <a
                  href={`https://wa.me/${clinic.whatsapp}?text=${encodeURIComponent(`Hello ${clinic.name}, I would like to enquire about an appointment with ${title(doctor)} (${doctor.speciality}).`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-[1.5px] border-ink px-5 text-base font-bold hover:bg-ink hover:text-white"
                >
                  WhatsApp Reception
                </a>
              </>
            )}
            <ShareButton
              title={`${title(doctor)} at ${clinic.name}`}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line-strong px-5 text-base font-bold hover:border-brand sm:col-span-2 lg:col-span-1 xl:col-span-2"
            />
          </div>
        </section>
      </div>

      {doctor.emergencyHint && <EmergencyNote hint={doctor.emergencyHint} className="mt-5" />}

      {/* Facilities & procedures if any */}
      {doctor.facilities && doctor.facilities.length > 0 && (
        <section aria-labelledby="facilities" className="reveal mt-8 sm:mt-12">
          <h2 id="facilities" className="font-display text-2xl font-medium tracking-tight sm:text-3xl text-ink">
            Specialized Facilities &amp; In-Clinic Procedures
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2.5">
            {doctor.facilities.map((f) => (
              <li key={f} className="card card-hover flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-charcoal">
                <CheckIcon className="size-4 text-brand shrink-0" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Common reasons to visit */}
      <section aria-labelledby="reasons" className="reveal mt-8 sm:mt-12">
        <h2 id="reasons" className="font-display text-2xl font-medium tracking-tight sm:text-3xl text-ink">
          When to consult {doctor.name ? doctor.name : `a ${doctor.speciality.toLowerCase()}`}
        </h2>
        <p className="mt-1 text-sm text-muted">Common symptoms, evaluations, and clinical conditions treated</p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {doctor.concerns.map((c) => (
            <li key={c} className="card card-hover rounded-full px-4 py-2 text-sm font-medium text-charcoal">
              {c}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted">
          Not sure this is the right doctor?{" "}
          <a href={`tel:${clinic.phone}`} className="font-semibold text-brand underline">
            Call <span className="whitespace-nowrap">{clinic.phoneDisplay}</span>
          </a>{" "}
          and reception will guide you.
        </p>
      </section>

      {/* Other doctors */}
      <section aria-labelledby="others" className="reveal mt-8 sm:mt-12">
        <h2 id="others" className="font-display text-2xl font-medium tracking-tight sm:text-3xl text-ink">
          Other Visiting Specialists
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {others.map((d) => (
            <li key={d.id}>
              <Link href={`/doctors/${d.id}`} className="card card-hover flex items-center gap-3.5 rounded-2xl p-4 group">
                <DoctorMark doctor={d} className="size-12 rounded-full text-xl" />
                <span className="flex min-w-0 flex-1 flex-col leading-snug">
                  <span className="font-display text-lg font-medium text-ink group-hover:text-brand transition-colors truncate">{title(d)}</span>
                  <span className="text-xs text-muted truncate">{d.name ? d.speciality : "Specialist Consultant"}</span>
                  {d.experienceYears && (
                    <span className="text-[11px] text-muted font-medium">{d.experienceYears} yrs experience</span>
                  )}
                </span>
                <ChevronRightIcon className="size-5 shrink-0 text-muted group-hover:text-brand group-hover:translate-x-0.5 transition-all" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
