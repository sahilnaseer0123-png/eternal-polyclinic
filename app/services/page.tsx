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
            <li key={service.id} id={service.id} className="card scroll-mt-24 flex flex-col gap-1 rounded-3xl p-5 sm:p-6">
              <span className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-brand-tint text-brand">
                <ServiceIcon id={service.id} />
              </span>
              <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">{service.name}</h2>
              <p className="text-base text-muted">{service.description}</p>
              {service.lead && <p className="mt-auto pt-2 text-base font-medium">With {service.lead}</p>}
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
