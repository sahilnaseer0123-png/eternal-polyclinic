import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { clinic } from "@/data/clinic";
import { BookingSection, BookingSkeleton } from "@/components/BookingSection";
import { PageIntro } from "@/components/SiteChrome";
import { EmergencyNote } from "@/components/EmergencyNote";

export const metadata: Metadata = {
  alternates: { canonical: "/book" },
  title: "Book an appointment",
  description: `Request a slot with a specialist at ${clinic.name}, Sopore. No account needed; reception confirms by phone.`,
};

export default function BookPage() {
  return (
    <>
      <PageIntro title="Book an appointment">Takes under a minute. No account needed.</PageIntro>
      <div className="mx-auto max-w-6xl px-5 pb-5">
        <EmergencyNote />
      </div>

      <div className="mx-auto grid max-w-6xl gap-10 px-5 pb-24 sm:pb-16 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Suspense fallback={<BookingSkeleton />}>
          <BookingSection />
        </Suspense>

        <div className="flex flex-col gap-5">
          <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">How it works</h2>
          <ol className="flex list-decimal flex-col gap-3 pl-6 text-lg">
            <li>Choose your doctor.</li>
            <li>Pick one of their OPD days and a time.</li>
            <li>Add your name and mobile number.</li>
            <li>
              Press Send in WhatsApp ({clinic.whatsappDisplay}). Reception calls you to confirm.
            </li>
          </ol>
          <div className="card rounded-3xl p-5">
            <p className="font-semibold">Your privacy</p>
            <p className="text-base text-muted">
              We ask only your name and number, and the website saves nothing. The message names your doctor, never the
              reason for your visit. It stays in your WhatsApp chat like any message, so delete it if others use your
              phone.{" "}
              <Link href="/privacy" className="font-semibold text-brand underline">
                Privacy notice
              </Link>
            </p>
          </div>
          <p className="text-base text-muted">
            Prefer to talk?{" "}
            <a href={`tel:${clinic.phone}`} className="font-semibold text-brand underline">
              Call <span className="whitespace-nowrap">{clinic.phoneDisplay}</span>
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
