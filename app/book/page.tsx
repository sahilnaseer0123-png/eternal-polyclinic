import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { clinic } from "@/data/clinic";
import { BookingSection, BookingSkeleton } from "@/components/BookingSection";
import { PageIntro } from "@/components/SiteChrome";
import { EmergencyNote } from "@/components/EmergencyNote";
import { PhoneIcon, ShieldCheckIcon, WhatsAppIcon } from "@/components/Icons";

export const metadata: Metadata = {
  alternates: { canonical: "/book" },
  title: "Book a visit",
  description: `Schedule a consultation slot with visiting specialists at ${clinic.name}, Opposite SDH Hospital, Sopore. Your slot is confirmed instantly online with a digital token, and a confirmation goes to your WhatsApp.`,
};

export default function BookPage() {
  return (
    <>
      <div className="no-print">
        <PageIntro title="Book a visit">
        Pick a doctor, a day and a time. Your slot is confirmed instantly and your token is sent to your WhatsApp.
      </PageIntro>
      </div>

      <div className="no-print mx-auto max-w-6xl px-5 pb-4 sm:px-6">
        <EmergencyNote />
      </div>

      <div className="mx-auto grid max-w-6xl gap-8 px-5 pb-24 sm:px-6 sm:pb-16 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Suspense fallback={<BookingSkeleton />}>
          <BookingSection />
        </Suspense>

        <div className="no-print flex flex-col gap-5">
          <div className="card rounded-3xl p-6">
            <h2 className="font-display text-2xl font-medium tracking-tight">How it works</h2>
            <ol className="mt-4 flex flex-col gap-4 text-base text-charcoal">
              {[
                ["Choose", "a doctor, a day and a time."],
                ["Confirm.", "Your slot is locked instantly and you get a digital token slip."],
                ["Check WhatsApp.", "We message your confirmation. Lost it? Use Find My Token with your mobile number."],
              ].map(([bold, rest], i) => (
                <li key={bold} className="flex items-start gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-tint font-display text-lg font-medium text-brand tabular-nums lining-nums">
                    {i + 1}
                  </span>
                  <span>
                    <strong>{bold}</strong> {rest}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-3xl bg-sand p-6">
            <div className="flex items-center gap-2 text-brand">
              <ShieldCheckIcon className="size-4" />
              <span className="eyebrow">Your privacy</span>
            </div>
            <p className="mt-2 text-base text-charcoal">
              We save only your token, name, mobile number, optional area, doctor and slot in the clinic&apos;s PIN-protected register, to hold your slot and send your WhatsApp confirmation. We never ask why you are visiting, and public pages never show anyone&apos;s details.{" "}
              <Link href="/privacy" className="font-semibold text-brand underline">
                Read the privacy notice
              </Link>
            </p>
          </div>

          <div className="card rounded-3xl p-6">
            <h2 className="font-display text-xl font-medium tracking-tight">Prefer to talk?</h2>
            <p className="mt-1 text-base text-muted">Reception answers during clinic hours.</p>
            <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
              <a
                href={`tel:${clinic.phone}`}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-[1.5px] border-ink px-5 text-base font-bold hover:bg-ink hover:text-white"
              >
                <PhoneIcon className="size-4" />
                Call {clinic.phoneDisplay}
              </a>
              <a
                href={`https://wa.me/${clinic.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-base font-bold text-white hover:bg-brand-dark"
              >
                <WhatsAppIcon className="size-4" />
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
