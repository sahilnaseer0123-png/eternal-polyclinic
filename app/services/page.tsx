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
        <ul className="grid gap-4 sm:grid-cols-2">
          {services.map((service) => {
            const action = serviceActions(service);
            return (
              <li
                key={service.id}
                id={service.id}
                className="card card-hover scroll-mt-24 flex flex-col justify-between gap-4 rounded-2xl p-6"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex size-12 items-center justify-center rounded-xl bg-brand-tint text-ink ring-1 ring-brand-line/70">
                      <ServiceIcon id={service.id} className="size-6" />
                    </span>
                  </div>
                  <h2 className="mt-3 text-xl font-medium tracking-tight text-ink font-display sm:text-2xl">
                    {service.name}
                  </h2>
                  <p className="mt-1 text-[15px] text-muted leading-relaxed">{service.description}</p>
                  {service.lead && (
                    <p className="mt-3 text-xs font-bold text-ink">
                      Lead: <span className="font-medium text-muted">{service.lead}</span>
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2.5 border-t border-line/70 pt-4">
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
        <div className="mt-8">
          <ReportCollectionSection />
        </div>
      </section>
    </>
  );
}
