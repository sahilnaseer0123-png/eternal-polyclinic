import type { Metadata } from "next";
import { clinic } from "@/data/clinic";
import { Faq } from "@/components/Faq";
import { PageIntro } from "@/components/SiteChrome";

export const metadata: Metadata = {
  title: "Questions patients ask",
  description: `Booking, fees, privacy and directions for ${clinic.name}, Sopore.`,
};

export default function FaqPage() {
  return (
    <>
      <PageIntro title="Questions patients ask" />
      <section aria-label="Questions and answers" className="mx-auto max-w-6xl px-5 pb-16">
        <div className="max-w-3xl">
          <Faq />
        </div>
        <p className="mt-6 text-muted">
          Something else?{" "}
          <a href={`tel:${clinic.phone}`} className="font-semibold text-brand underline">
            Call {clinic.phoneDisplay}
          </a>
          .
        </p>
      </section>
    </>
  );
}
