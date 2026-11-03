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
  description: `Schedule a consultation slot with visiting specialists at ${clinic.name}, Opposite SDH Hospital, Sopore. Send your request on WhatsApp; reception confirms by phone.`,
};

export default function BookPage() {
  return (
    <>
      <PageIntro title="Book a visit">
        Pick a doctor, a day and a time. Your request opens in WhatsApp, and reception calls you to confirm.
      </PageIntro>

      <div className="mx-auto max-w-6xl px-5 pb-4 sm:px-6">
        <EmergencyNote />
      </div>

      <div className="mx-auto grid max-w-6xl gap-8 px-5 pb-24 sm:px-6 sm:pb-16 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Suspense fallback={<BookingSkeleton />}>
          <BookingSection />
        </Suspense>

        <div className="flex flex-col gap-5">
          <div className="card rounded-3xl p-6">
            <h2 className="font-display text-2xl font-medium tracking-tight">How it works</h2>
            <ol className="mt-4 flex flex-col gap-4 text-base text-charcoal">
              {[
                ["Choose", "a doctor, a day and a time."],
                ["Send", "the request on WhatsApp. It only reaches the clinic when you press Send."],
                ["Wait for our call.", "Reception phones you to confirm. The time is booked only after that."],
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
              This website saves nothing. Your request goes into your own WhatsApp chat with the clinic, and it stays there.{" "}
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
