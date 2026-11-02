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
        Clear information regarding visiting doctors, OPD token reservations, diagnostic services, and clinic visiting protocol.
      </PageIntro>

      <section aria-label="Questions and answers" className="mx-auto max-w-6xl px-4 sm:px-6 pb-24 sm:pb-16">
        <div className="max-w-3xl">
          <Faq />

          {/* Help card */}
          <div className="mt-8 rounded-2xl border border-line bg-white p-6 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-ink">
                Have a question not covered above?
              </h3>
              <p className="text-xs text-muted mt-0.5 leading-relaxed">
                Our front desk is available daily to assist with doctor schedules and appointments.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <a
                href={`tel:${clinic.phone}`}
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-line bg-ground px-3.5 text-xs font-bold text-ink hover:border-brand-line hover:text-brand transition-colors"
              >
                <PhoneIcon className="size-3.5 text-brand" />
                <span>Call {clinic.phoneDisplay}</span>
              </a>

              <a
                href={`https://wa.me/${clinic.whatsapp}?text=${encodeURIComponent("Hello Eternal Polyclinic, I have a query regarding clinical services.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-[#25D366] px-3.5 text-xs font-bold text-white hover:bg-[#20ba59] shadow-subtle transition-colors"
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
