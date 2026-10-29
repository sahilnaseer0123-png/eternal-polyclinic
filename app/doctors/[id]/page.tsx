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
import { CalendarIcon, CategoryIcon, ChevronRightIcon, PhoneIcon } from "@/components/Icons";
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
  const facts = [
    doctor.degree && doctor.degree.toLowerCase() !== doctor.speciality.toLowerCase() ? doctor.degree : null,
    doctor.experienceYears ? `${doctor.experienceYears} years of experience` : null,
  ].filter(Boolean);
  // For search engines: who this doctor is and where they practise, plus Home > Doctors > this page.
  const schema = [doctorSchema(doctor), doctorBreadcrumbs(doctor)].filter(Boolean);

  return (
    <div className="mx-auto max-w-6xl px-5 pb-12 pt-5 sm:pb-16 sm:pt-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <Link href="/doctors" className="inline-flex min-h-11 items-center gap-1 font-semibold text-brand">
        <ChevronRightIcon className="size-4 rotate-180" /> All doctors
      </Link>

      <div className="mt-3 grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-8">
        {/* Who */}
        <section className="rise card flex flex-col gap-5 rounded-3xl p-5 sm:flex-row sm:items-center sm:p-8">
          <DoctorMark doctor={doctor} className="size-24 rounded-3xl bg-brand-tint text-5xl text-brand sm:size-32 sm:text-6xl lg:size-24 lg:text-5xl xl:size-32 xl:text-6xl" />
          <div className="min-w-0">
            <h1 className="text-[1.75rem] font-extrabold leading-tight [overflow-wrap:anywhere] sm:text-5xl lg:text-4xl xl:text-5xl">{title(doctor)}</h1>
            <p className="mt-1 text-muted sm:text-lg">
              {doctor.name ? doctor.speciality : "Name to be confirmed"}
              {facts.length > 0 && ` · ${facts.join(" · ")}`}
            </p>
            {doctor.designation && (
              <p className="mt-1 text-base font-semibold text-slate-800">{doctor.designation}</p>
            )}
            {doctor.credentials && (
              <p className="mt-1 text-sm text-muted">{doctor.credentials}</p>
            )}
            <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-brand-tint px-3 py-1 text-sm font-semibold text-brand">
              <CategoryIcon category={doctor.category} />
              {doctor.categoryLabel}
            </p>
            {doctor.registrationNo && (
              <p className="mt-2 text-sm text-muted">Registration no. {doctor.registrationNo}</p>
            )}
          </div>
        </section>

        {/* When, and how to book */}
        <section aria-labelledby="when" className="rise rise-2 flex flex-col gap-4 rounded-3xl bg-ink p-5 text-white sm:p-7">
          <h2 id="when" className="text-sm font-bold uppercase tracking-wider text-glow">
            When to visit
          </h2>
          {doctor.opd.length > 0 ? (
            <ul className="flex flex-col divide-y divide-slate-700">
              {doctor.opd.map((s) => (
                <li key={`${s.day}-${s.start}`} className="flex items-center justify-between gap-4 py-2.5">
                  <span className="flex items-center gap-2 font-semibold">
                    <CalendarIcon className="size-5 text-glow" />
                    {s.recurrence === "first-of-month"
                      ? `1st ${DAY_NAMES[s.day]} of month`
                      : s.recurrence === "alternate"
                        ? `Alt ${DAY_NAMES[s.day]}s`
                        : DAY_NAMES[s.day]}
                  </span>
                  <span className="text-slate-300">
                    {formatTime(s.start)} – {formatTime(s.end)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-300">
              {doctor.availability ?? "Days coming soon. Please call and reception will tell you when to come."}
            </p>
          )}
          {doctor.opd.length > 0 && (
            <p className="font-semibold text-white">
              <NextAvailable doctorId={doctor.id} fallback={"\u00a0"} prefix="Next free slot: " />
            </p>
          )}
          <p className="text-slate-400">
            Consultation ₹{clinic.consultationFee}. {clinic.address}.
          </p>
          <div className="mt-auto grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {doctor.opd.length > 0 ? (
              <Link
                href={`/book?doctor=${doctor.id}`}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-white px-5 font-bold text-ink hover:bg-slate-100"
              >
                Book {title(doctor)}
              </Link>
            ) : (
              <a
                href={`tel:${clinic.phone}`}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 font-bold text-ink hover:bg-slate-100"
              >
                <PhoneIcon /> Call to book
              </a>
            )}
            <ShareButton title={`${title(doctor)} at ${clinic.name}`} />
          </div>
        </section>
      </div>

      {doctor.emergencyHint && <EmergencyNote hint={doctor.emergencyHint} className="mt-5" />}

      {/* Facilities & procedures if any */}
      {doctor.facilities && doctor.facilities.length > 0 && (
        <section aria-labelledby="facilities" className="reveal mt-8 sm:mt-12">
          <h2 id="facilities" className="text-xl font-extrabold sm:text-2xl">
            Specialized facilities &amp; procedures
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2.5">
            {doctor.facilities.map((f) => (
              <li key={f} className="card rounded-2xl px-4 py-2 text-base font-semibold text-brand-dark">
                {f}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Common reasons to visit */}
      <section aria-labelledby="reasons" className="reveal mt-8 sm:mt-12">
        <h2 id="reasons" className="text-xl font-extrabold sm:text-3xl">
          Common reasons to see {doctor.name ? doctor.name : `a ${doctor.speciality.toLowerCase()}`}
        </h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {doctor.concerns.map((c) => (
            <li key={c} className="card rounded-full px-4 py-2 font-semibold">
              {c}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-muted">
          Not sure this is the right doctor?{" "}
          <a href={`tel:${clinic.phone}`} className="font-semibold text-brand underline">
            Call {clinic.phoneDisplay}
          </a>{" "}
          and reception will guide you.
        </p>
      </section>

      {/* Other doctors */}
      <section aria-labelledby="others" className="reveal mt-8 sm:mt-12">
        <h2 id="others" className="text-xl font-extrabold sm:text-3xl">
          Other specialists
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {others.map((d) => (
            <li key={d.id}>
              <Link href={`/doctors/${d.id}`} className="card flex items-center gap-3 rounded-3xl p-3 sm:p-4">
                <DoctorMark doctor={d} className="size-12 rounded-2xl bg-brand-tint text-xl text-brand" />
                <span className="flex min-w-0 flex-1 flex-col leading-snug">
                  <span className="font-bold">{title(d)}</span>
                  <span className="text-sm text-muted">{d.name ? d.speciality : "Name to be confirmed"}</span>
                </span>
                <ChevronRightIcon className="size-5 shrink-0 text-slate-400" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
