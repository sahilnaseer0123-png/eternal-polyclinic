import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { clinic } from "@/data/clinic";
import { BookingSection, BookingSkeleton } from "@/components/BookingSection";
import { PageIntro } from "@/components/SiteChrome";
import { EmergencyNote } from "@/components/EmergencyNote";
import { ClockIcon, PhoneIcon, ShieldCheckIcon, WhatsAppIcon } from "@/components/Icons";

export const metadata: Metadata = {
  alternates: { canonical: "/book" },
  title: "Book a Specialist Consultation | Eternal Polyclinic Sopore",
  description: `Schedule a consultation slot with visiting specialists at ${clinic.name}, Opposite SDH Hospital, Sopore. Instant digital token slip and phone confirmation.`,
};

export default function BookPage() {
  return (
    <>
      <PageIntro title="Book an appointment">
        Select a visiting consultant and reserve your consultation token in under a minute. No pre-payment or account registration required.
      </PageIntro>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 pb-6">
        <EmergencyNote />
      </div>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 pb-24 sm:pb-16 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Suspense fallback={<BookingSkeleton />}>
          <BookingSection />
        </Suspense>

        {/* Right Info Column: Swiss Editorial Standards */}
        <div className="flex flex-col gap-6">
          <div className="card rounded-2xl border border-line bg-white p-6 shadow-card">
            <h2 className="text-lg font-bold tracking-tight text-ink font-display mb-4">
              How Consultation Booking Works
            </h2>
            <ol className="flex flex-col gap-3.5 text-xs sm:text-sm text-charcoal">
              <li className="flex items-start gap-3">
                <span className="size-6 rounded-full bg-brand-tint border border-brand-line/60 text-brand text-xs font-bold inline-flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <span>
                  <strong>Select Your Specialist:</strong> Choose the doctor matching your clinical requirement or symptoms.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="size-6 rounded-full bg-brand-tint border border-brand-line/60 text-brand text-xs font-bold inline-flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <span>
                  <strong>Choose Date &amp; Time:</strong> View confirmed OPD visiting days and reserve an open time slot.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="size-6 rounded-full bg-brand-tint border border-brand-line/60 text-brand text-xs font-bold inline-flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <span>
                  <strong>Get Your Digital Slip:</strong> An official token slip is generated immediately with your slot number and arrival guidance.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="size-6 rounded-full bg-brand-tint border border-brand-line/60 text-brand text-xs font-bold inline-flex items-center justify-center shrink-0 mt-0.5">
                  4
                </span>
                <span>
                  <strong>Consult &amp; Pay at Clinic:</strong> Arrive 10 minutes before your slot; pay the standard consultation fee directly at the reception desk.
                </span>
              </li>
            </ol>
          </div>

          {/* Privacy & Clinical Confidentiality */}
          <div className="card rounded-2xl border border-line bg-white p-6 shadow-card">
            <div className="flex items-center gap-2 mb-2 text-brand">
              <ShieldCheckIcon className="size-4" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Patient Privacy
              </span>
            </div>
            <p className="text-xs sm:text-sm text-charcoal leading-relaxed">
              We collect only the patient name and contact phone necessary for token identification at reception. No medical reasons or private history are saved online.{" "}
              <Link href="/privacy" className="font-semibold text-brand hover:underline">
                Read privacy policy →
              </Link>
            </p>
          </div>

          {/* Direct Telephone Assistance Card */}
          <div className="rounded-2xl border border-line bg-ground p-6">
            <h3 className="text-sm font-bold text-ink mb-1">
              Prefer to Book by Phone or WhatsApp?
            </h3>
            <p className="text-xs text-muted leading-relaxed mb-4">
              Our front desk at Lone Complex is available during clinic hours to answer queries and schedule appointments.
            </p>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <a
                href={`tel:${clinic.phone}`}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white border border-line px-4 text-xs font-bold text-ink hover:border-brand-line hover:text-brand shadow-subtle transition-all"
              >
                <PhoneIcon className="size-3.5 text-brand" />
                <span>Call {clinic.phoneDisplay}</span>
              </a>

              <a
                href={`https://wa.me/${clinic.whatsapp}?text=${encodeURIComponent("Hello Eternal Polyclinic, I would like to enquire about doctor consultation slots.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-xs font-bold text-white hover:bg-[#20ba59] shadow-subtle transition-all"
              >
                <WhatsAppIcon className="size-3.5" />
                <span>WhatsApp Reception</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
