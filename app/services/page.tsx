import type { Metadata } from "next";
import { clinic, services } from "@/data/clinic";
import { PageIntro } from "@/components/SiteChrome";
import { ServiceIcon } from "@/components/Icons";
import { ReportCollectionSection } from "@/components/ReportCollectionSection";

export const metadata: Metadata = {
  alternates: { canonical: "/services" },
  title: "Tests and services",
  description: `${services.map((s) => s.name).join(", ")} at ${clinic.name}, Sopore.`,
};

export default function ServicesPage() {
  return (
    <>
      <PageIntro title="Tests and services">No need to go elsewhere for scans, reports or medicines.</PageIntro>
      <section aria-label="Services" className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 sm:pb-16">
        <ul className="grid gap-4 sm:grid-cols-2">
          {services.map((service) => (
            <li
              key={service.id}
              id={service.id}
              className="card card-hover scroll-mt-24 flex flex-col justify-between gap-3 rounded-2xl p-6"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex size-12 items-center justify-center rounded-xl bg-brand-tint text-brand">
                    <ServiceIcon id={service.id} className="size-6" />
                  </span>
                </div>
                <h2 className="mt-3 text-xl font-medium tracking-tight text-ink font-display sm:text-2xl">
                  {service.name}
                </h2>
                <p className="mt-1 text-[15px] text-muted leading-relaxed">{service.description}</p>
              </div>
              {service.lead && (
                <div className="border-t border-line/60 pt-3">
                  <p className="text-xs font-bold text-ink">
                    Lead: <span className="font-medium text-muted">{service.lead}</span>
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>

        {/* Digital Lab & Scan Reports on WhatsApp */}
        <div className="mt-8">
          <ReportCollectionSection />
        </div>
      </section>
    </>
  );
}
