// One page per doctor (/doctors/akash): details, the days they sit, Book or Call, and Share.
// Built at build time from data/clinic.ts; nothing here depends on today's date.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { clinic, doctors } from "@/data/clinic";
import { DAY_NAMES, formatTime, opdSummary } from "@/lib/schedule";
import { DoctorMark } from "@/components/DoctorMark";
import { ShareButton } from "@/components/ShareButton";
import { NextAvailable } from "@/components/NextAvailable";
import { EmergencyNote } from "@/components/EmergencyNote";
import { CalendarIcon, CategoryIcon, CheckIcon, ChevronRightIcon, HospitalIcon, PhoneIcon } from "@/components/Icons";
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
    description: `${title(doctor)} at ${clinic.name}, Sopore. ${days ? `Sits on ${days}.` : "Days coming soon."} Consultation ₹${clinic.consultationFee}.`,
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

      <div className="mt-3 grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-8">
        {/* Who */}
        <section className="rise card flex flex-col gap-4 rounded-3xl p-4 sm:flex-row sm:items-start sm:gap-6 sm:p-8 border border-line/70">
          <DoctorMark doctor={doctor} className="size-20 shrink-0 rounded-2xl bg-brand-tint text-4xl text-brand sm:size-28 sm:rounded-3xl sm:text-6xl lg:size-24 lg:text-5xl xl:size-28 xl:text-6xl shadow-inner" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-tint px-2.5 py-0.5 text-xs font-bold text-brand">
                <CategoryIcon category={doctor.category} className="size-3.5" />
                {doctor.categoryLabel}
              </span>
              {doctor.experienceYears && (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                  {doctor.experienceYears}+ Yrs Exp.
                </span>
              )}
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                ₹{clinic.consultationFee} OPD Fee
              </span>
            </div>

            <h1 className="mt-2 text-[1.75rem] font-extrabold leading-tight [overflow-wrap:anywhere] sm:text-4xl lg:text-3xl xl:text-4xl text-ink">
              {title(doctor)}
            </h1>
            <p className="mt-1 text-base font-semibold text-brand">
              {doctor.name ? doctor.speciality : "Specialist Consultant"}
              {doctor.degree && ` · ${doctor.degree}`}
            </p>
            {doctor.designation && (
              <p className="mt-2 text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <HospitalIcon className="size-4 shrink-0 text-brand" />
                <span>{doctor.designation}</span>
              </p>
            )}
            {doctor.credentials && (
              <p className="mt-1.5 text-xs text-muted leading-relaxed">
                {doctor.credentials}
              </p>
            )}
          </div>
        </section>

        {/* When, and how to book */}
        <section aria-labelledby="when" className="rise rise-2 flex flex-col justify-between gap-5 rounded-3xl bg-ink p-4 text-white sm:p-7 shadow-lg border border-slate-800">
          <div>
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="relative flex size-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-glow opacity-75"></span>
                  <span className="relative inline-flex size-2.5 rounded-full bg-glow"></span>
                </span>
                <h2 id="when" className="text-xs font-bold uppercase tracking-wider text-glow">
                  OPD Schedule &amp; Timings
                </h2>
              </div>
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-slate-200">
                ₹{clinic.consultationFee} Fee
              </span>
            </div>

            {doctor.opd.length > 0 ? (
              <ul className="mt-3 flex flex-col divide-y divide-slate-800/80">
                {doctor.opd.map((s) => (
                  <li key={`${s.day}-${s.start}`} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                    <span className="flex items-center gap-2 font-semibold text-slate-100">
                      <CalendarIcon className="size-4 text-glow shrink-0" />
                      {s.recurrence === "first-of-month"
                        ? `1st ${DAY_NAMES[s.day]} of month`
                        : s.recurrence === "alternate"
                          ? `Alt ${DAY_NAMES[s.day]}s (Call to confirm)`
                          : DAY_NAMES[s.day]}
                    </span>
                    <span className="font-mono text-xs font-medium text-slate-300 bg-white/5 px-2.5 py-1 rounded-lg">
                      {formatTime(s.start)} – {formatTime(s.end)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-slate-300 leading-relaxed">
                {doctor.availability ?? "Days coming soon. Please call reception and we will arrange your slot."}
              </p>
            )}

            {doctor.opd.length > 0 && (
              <div className="mt-4 rounded-xl bg-white/5 p-3 text-xs font-semibold text-glow flex items-center gap-2 border border-white/10">
                <span className="size-2 rounded-full bg-glow"></span>
                <NextAvailable doctorId={doctor.id} fallback={"Checking next slot..."} prefix="Next free slot: " />
              </div>
            )}
            
            <p className="mt-3 text-xs text-slate-400">
              {clinic.address} · Zero registration fee
            </p>
          </div>

          <div className="grid gap-2.5 pt-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {doctor.opd.length > 0 ? (
              <Link
                href={`/book?doctor=${doctor.id}`}
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-5 font-bold text-ink hover:bg-slate-100 transition-colors shadow-sm"
              >
                Book Appointment
              </Link>
            ) : (
              <a
                href={`tel:${clinic.phone}`}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 font-bold text-ink hover:bg-slate-100 transition-colors shadow-sm"
              >
                <PhoneIcon className="size-4" /> Call to Book
              </a>
            )}
            <ShareButton
              title={`${title(doctor)} at ${clinic.name}`}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white/10 text-white hover:bg-white/20 border border-white/15 px-5 font-bold transition-colors"
            />
          </div>
        </section>
      </div>

      {doctor.emergencyHint && <EmergencyNote hint={doctor.emergencyHint} className="mt-5" />}

      {/* Facilities & procedures if any */}
      {doctor.facilities && doctor.facilities.length > 0 && (
        <section aria-labelledby="facilities" className="reveal mt-8 sm:mt-12">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-brand"></span>
            <h2 id="facilities" className="text-xl font-extrabold sm:text-2xl text-ink">
              Specialized Facilities &amp; In-Clinic Procedures
            </h2>
          </div>
          <ul className="mt-4 flex flex-wrap gap-2.5">
            {doctor.facilities.map((f) => (
              <li key={f} className="card card-hover flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 border border-line/70">
                <CheckIcon className="size-4 text-brand shrink-0" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Common reasons to visit */}
      <section aria-labelledby="reasons" className="reveal mt-8 sm:mt-12">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-brand"></span>
          <h2 id="reasons" className="text-xl font-extrabold sm:text-2xl text-ink">
            When to consult {doctor.name ? doctor.name : `a ${doctor.speciality.toLowerCase()}`}
          </h2>
        </div>
        <p className="mt-1 text-sm text-muted">Common symptoms, evaluations, and clinical conditions treated</p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {doctor.concerns.map((c) => (
            <li key={c} className="card card-hover rounded-full px-4 py-2 text-sm font-medium text-slate-700 border border-line/70 bg-white">
              {c}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted">
          Not sure this is the right doctor?{" "}
          <a href={`tel:${clinic.phone}`} className="font-semibold text-brand underline">
            Call {clinic.phoneDisplay}
          </a>{" "}
          and reception will guide you.
        </p>
      </section>

      {/* Other doctors */}
      <section aria-labelledby="others" className="reveal mt-8 sm:mt-12">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-brand"></span>
          <h2 id="others" className="text-xl font-extrabold sm:text-2xl text-ink">
            Other Visiting Specialists
          </h2>
        </div>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {others.map((d) => (
            <li key={d.id}>
              <Link href={`/doctors/${d.id}`} className="card card-hover flex items-center gap-3.5 rounded-2xl p-4 border border-line/70 group">
                <DoctorMark doctor={d} className="size-12 rounded-xl bg-brand-tint text-xl text-brand group-hover:scale-105 transition-transform" />
                <span className="flex min-w-0 flex-1 flex-col leading-snug">
                  <span className="font-bold text-slate-900 group-hover:text-brand transition-colors truncate">{title(d)}</span>
                  <span className="text-xs text-muted truncate">{d.name ? d.speciality : "Specialist Consultant"}</span>
                  {d.experienceYears && (
                    <span className="text-[11px] text-slate-500 font-medium">{d.experienceYears} yrs experience</span>
                  )}
                </span>
                <ChevronRightIcon className="size-5 shrink-0 text-slate-400 group-hover:text-brand group-hover:translate-x-0.5 transition-all" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
