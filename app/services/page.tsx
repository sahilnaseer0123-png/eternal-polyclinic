import type { Metadata } from "next";
import { clinic, serviceActions, services } from "@/data/clinic";
import { PageIntro } from "@/components/SiteChrome";
import { PhoneIcon, ServiceIcon, WhatsAppIcon } from "@/components/Icons";
import { ReportCollectionSection } from "@/components/ReportCollectionSection";

export const metadata: Metadata = {
  alternates: { canonical: "/services" },
  title: "Tests and services",
  description: `${services.map((s) => s.name).join(", ")} at ${clinic.name}, Sopore, for patients across Baramulla, Bandipora, Kupwara and North Kashmir.`,
};

export default function ServicesPage() {
  return (
    <>
      <PageIntro title="Tests and services">No need to go elsewhere for scans, reports or medicines.</PageIntro>
      <section aria-label="Services" className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 sm:pb-16">
        <div
          aria-label="Jump to service"
          className="sm:hidden -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]"
        >
          {services.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="inline-flex min-h-10 shrink-0 items-center rounded-full border border-line-strong bg-white px-3.5 text-xs font-semibold text-ink hover:border-brand"
            >
              {s.short}
            </a>
          ))}
          <a
            href="#digital-reports"
            className="inline-flex min-h-10 shrink-0 items-center rounded-full border border-brand-line bg-brand-tint px-3.5 text-xs font-bold text-accent"
          >
            PDF Reports
          </a>
        </div>

        <ul className="reveal-group grid gap-3 sm:gap-4 sm:grid-cols-2">
          {services.map((service) => {
            const action = serviceActions(service);
            return (
              <li
                key={service.id}
                id={service.id}
                data-draw=""
                className="reveal card card-hover scroll-mt-24 flex flex-col justify-between gap-3 sm:gap-4 rounded-2xl p-4 sm:p-6"
              >
                <div>
                  <div className="flex items-center gap-3 sm:block">
                    <span className="flex size-10 sm:size-12 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-ink ring-1 ring-brand-line/70">
                      <ServiceIcon id={service.id} className="size-5 sm:size-6" />
                    </span>
                    <h2 className="sm:mt-3 text-lg sm:text-2xl font-medium tracking-tight text-ink font-display">
                      {service.name}
                    </h2>
                  </div>
                  <p className="mt-2 sm:mt-1 text-sm sm:text-[15px] text-muted leading-relaxed">{service.description}</p>
                  {service.lead && (
                    <p className="mt-2 sm:mt-3 text-xs font-bold text-ink">
                      Lead: <span className="font-medium text-muted">{service.lead}</span>
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 border-t border-line/70 pt-3 sm:pt-4">
                  <a
                    href={action.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark transition-colors whitespace-nowrap"
                  >
                    <WhatsAppIcon className="size-4 shrink-0" />
                    <span>{action.whatsappLabel}</span>
                  </a>
                  <a
                    href={action.phoneHref}
                    className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-line-strong bg-white px-4 text-sm font-semibold text-ink hover:border-brand hover:bg-ground transition-colors whitespace-nowrap tabular-nums lining-nums"
                  >
                    <PhoneIcon className="size-3.5 shrink-0 text-ink" />
                    <span>{action.phoneLabel}</span>
                  </a>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Digital Lab & Scan Reports on WhatsApp */}
        <div className="reveal mt-8">
          <ReportCollectionSection />
        </div>
      </section>
    </>
  );
}
