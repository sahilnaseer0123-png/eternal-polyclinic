import type { Metadata } from "next";
import Link from "next/link";
import { clinic } from "@/data/clinic";
import { PageIntro } from "@/components/SiteChrome";
import { EmergencyNote } from "@/components/EmergencyNote";
import { CalendarIcon, MapPinIcon, PhoneIcon, ReportIcon, UserIcon, WhatsAppIcon } from "@/components/Icons";

export const metadata: Metadata = {
  alternates: { canonical: "/book" },
  title: "OPD Enquiry & Reception Contact",
  description: `Check visiting specialist OPD timings at ${clinic.name}, Opposite SDH Hospital, Sopore. Online booking is currently paused — contact reception directly on WhatsApp or phone.`,
};

export default function BookPage() {
  return (
    <>
      <PageIntro title="OPD enquiry & reception">
        Online booking is currently paused while we finalize our digital queue. Check our specialists&apos; sitting days below and contact reception directly on WhatsApp or phone.
      </PageIntro>

      <div className="mx-auto max-w-6xl px-5 pb-4 sm:px-6">
        <EmergencyNote />
      </div>

      <div className="mx-auto grid max-w-6xl gap-5 sm:gap-8 px-5 pb-24 sm:px-6 sm:pb-16 lg:grid-cols-2">
        {/* Direct Reception Contact */}
        <section className="reveal card flex flex-col justify-between gap-5 rounded-3xl p-5 sm:p-8">
          <div>
            <p className="eyebrow text-brand">Direct clinic contact</p>
            <h2 className="mt-2 font-display text-2xl font-medium tracking-tight text-ink sm:text-3xl">
              Message or call reception
            </h2>
            <p className="mt-2 text-sm sm:text-base leading-relaxed text-muted">
              Ask about specialist OPD timings, doctor availability, consultation fees, or diagnostic scans. Reception answers daily during clinic hours (8 am – 9 pm).
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                href={`https://wa.me/${clinic.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-base font-bold text-white shadow-button hover:bg-brand-dark transition-colors whitespace-nowrap"
              >
                <WhatsAppIcon className="size-4.5 shrink-0" />
                <span>WhatsApp ({clinic.whatsappDisplay})</span>
              </a>
              <a
                href={`tel:${clinic.phone}`}
                className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border-[1.5px] border-ink px-5 text-base font-bold text-ink hover:bg-ink hover:text-white transition-colors whitespace-nowrap"
              >
                <PhoneIcon className="size-4 shrink-0" />
                <span>Call {clinic.phoneDisplay}</span>
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-ground p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-accent ring-1 ring-brand-line/80">
                <ReportIcon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm sm:text-base font-semibold text-ink">Collect Lab &amp; Scan PDFs on WhatsApp</h3>
                <p className="mt-0.5 text-xs sm:text-sm text-muted">
                  Message lab technician ({clinic.labTechPhoneDisplay}) to receive digital reports without travelling back to Sopore.
                </p>
                <a
                  href={clinic.reportRequestUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2.5 inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-brand hover:underline"
                >
                  <WhatsAppIcon className="size-3.5 shrink-0" />
                  <span>Request PDF report →</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Clinic Info & Schedule Links */}
        <section className="reveal flex flex-col justify-between gap-5 rounded-3xl bg-sand p-5 sm:p-8">
          <div>
            <p className="eyebrow text-muted">Clinic information</p>
            <h2 className="mt-2 font-display text-2xl font-medium tracking-tight text-ink sm:text-3xl">
              Explore doctors &amp; OPD schedule
            </h2>
            <p className="mt-2 text-sm sm:text-base leading-relaxed text-charcoal">
              All specialist schedules, diagnostic services, and clinic directions are available directly on the website.
            </p>

            <ul className="mt-5 grid gap-3">
              <li>
                <Link
                  href="/doctors"
                  className="card card-hover flex items-center gap-3.5 rounded-2xl bg-white p-4"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-accent ring-1 ring-brand-line/80">
                    <UserIcon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink">View All Specialists</span>
                    <span className="block text-xs sm:text-sm text-muted">Search by specialty, degrees &amp; sitting days</span>
                  </span>
                  <span aria-hidden="true" className="text-sm font-bold text-brand">→</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/#days"
                  className="card card-hover flex items-center gap-3.5 rounded-2xl bg-white p-4"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-accent ring-1 ring-brand-line/80">
                    <CalendarIcon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink">Day-by-Day OPD Schedule</span>
                    <span className="block text-xs sm:text-sm text-muted">See who sits today and across all 7 days</span>
                  </span>
                  <span aria-hidden="true" className="text-sm font-bold text-brand">→</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="card card-hover flex items-center gap-3.5 rounded-2xl bg-white p-4"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-accent ring-1 ring-brand-line/80">
                    <MapPinIcon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink">Visit Us &amp; Directions</span>
                    <span className="block text-xs sm:text-sm text-muted">{clinic.address}</span>
                  </span>
                  <span aria-hidden="true" className="text-sm font-bold text-brand">→</span>
                </Link>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </>
  );
}
