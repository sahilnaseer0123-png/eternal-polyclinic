import type { Metadata } from "next";
import { clinic, services } from "@/data/clinic";
import { PageIntro } from "@/components/SiteChrome";

export const metadata: Metadata = {
  title: "Tests and services",
  description: `${services.map((s) => s.name).join(", ")} at ${clinic.name}, Sopore.`,
};

export default function ServicesPage() {
  return (
    <>
      <PageIntro title="Tests and services">No need to go elsewhere for scans, reports or medicines.</PageIntro>
      <section aria-label="Services" className="mx-auto max-w-6xl px-5 pb-16">
        <ul className="grid gap-5 sm:grid-cols-2">
          {services.map((service) => (
            <li key={service.id} className="flex flex-col gap-1 rounded-2xl border border-line bg-white p-6">
              <h2 className="text-2xl font-bold">{service.name}</h2>
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
