import type { Metadata } from "next";
import { clinic, services } from "@/data/clinic";
import { PageIntro } from "@/components/SiteChrome";
import { ServiceIcon } from "@/components/Icons";

export const metadata: Metadata = {
  alternates: { canonical: "/services" },
  title: "Tests and services",
  description: `${services.map((s) => s.name).join(", ")} at ${clinic.name}, Sopore.`,
};

export default function ServicesPage() {
  return (
    <>
      <PageIntro title="Tests and services">No need to go elsewhere for scans, reports or medicines.</PageIntro>
      <section aria-label="Services" className="mx-auto max-w-6xl px-5 pb-16">
        <ul className="reveal grid gap-3 sm:grid-cols-2 sm:gap-5">
          {services.map((service) => (
            <li
              key={service.id}
              id={service.id}
              className="card card-hover scroll-mt-24 flex flex-col gap-2 rounded-3xl border border-line/60 p-5 transition-all duration-200 sm:p-6"
            >
              <div className="flex items-center justify-between">
                <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-tint text-brand shadow-sm">
                  <ServiceIcon id={service.id} className="size-7" />
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {service.short}
                </span>
              </div>
              <h2 className="mt-2 text-xl font-extrabold tracking-tight sm:text-2xl">
                {service.name}
              </h2>
              <p className="text-base text-muted">{service.description}</p>
              {service.lead && (
                <div className="mt-auto border-t border-line/70 pt-3">
                  <p className="text-sm font-semibold text-ink">
                    Lead: <span className="font-normal text-muted">{service.lead}</span>
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-6 text-base text-muted">
          For timings and test prices,{" "}
          <a href={`tel:${clinic.phone}`} className="font-semibold text-brand underline">
            call {clinic.phoneDisplay}
          </a>
          .
        </p>
      </section>
    </>
  );
}
