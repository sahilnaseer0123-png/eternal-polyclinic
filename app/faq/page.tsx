import type { Metadata } from "next";
import { clinic } from "@/data/clinic";
import { Faq } from "@/components/Faq";
import { PageIntro } from "@/components/SiteChrome";
import { PhoneIcon, WhatsAppIcon } from "@/components/Icons";

export const metadata: Metadata = {
  alternates: { canonical: "/faq" },
  title: "Frequently Asked Questions | Eternal Polyclinic Sopore",
  description: `Answers regarding doctor booking, OPD timings, ultrasound reporting, consultation fees, and directions at ${clinic.name}, Sopore.`,
};

export default function FaqPage() {
  return (
    <>
      <PageIntro title="Frequently Asked Questions">
        Answers about visiting doctors, booking, tests and what to bring.
      </PageIntro>

      <section aria-label="Questions and answers" className="mx-auto max-w-6xl px-4 sm:px-6 pb-24 sm:pb-16">
        <div className="max-w-3xl">
          <Faq />

          {/* Help card */}
          <div className="mt-8 card rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-xl font-medium text-ink">
                Have a question not covered above?
              </h3>
              <p className="text-base text-muted mt-1 leading-relaxed">
                Our front desk is available daily to assist with doctor schedules and appointments.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <a
                href={`tel:${clinic.phone}`}
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-ink bg-transparent px-4 text-sm font-bold text-ink hover:bg-ink hover:text-white transition-colors"
              >
                <PhoneIcon className="size-3.5 text-brand" />
                <span>Call {clinic.phoneDisplay}</span>
              </a>

              <a
                href={`https://wa.me/${clinic.whatsapp}?text=${encodeURIComponent("Hello Eternal Polyclinic, I have a query regarding clinical services.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[#25D366] px-4 text-sm font-bold text-white hover:bg-[#20ba59] transition-colors"
              >
                <WhatsAppIcon className="size-3.5" />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
