import type { Metadata } from "next";
import { clinic } from "@/data/clinic";
import { formatTime } from "@/lib/schedule";
import { PageIntro } from "@/components/SiteChrome";
import { ChatIcon, ClockIcon, MapPinIcon, PhoneIcon } from "@/components/Icons";

export const metadata: Metadata = {
  title: "Contact and directions",
  description: `${clinic.name}, ${clinic.address}. Call ${clinic.phoneDisplay}, WhatsApp ${clinic.whatsappDisplay}.`,
};

const hours = `${formatTime(clinic.hours.open)} – ${formatTime(clinic.hours.close)}`;

export default function ContactPage() {
  return (
    <>
      <PageIntro title="Visit us" />
      <section aria-label="Address and contact" className="mx-auto max-w-6xl px-5 pb-16">
        <div className="grid gap-8 rounded-3xl border border-line bg-white p-6 sm:p-10 md:grid-cols-2">
          <div className="flex flex-col gap-5">
            <p className="flex items-start gap-3 text-lg">
              <MapPinIcon className="mt-1 size-5 shrink-0 text-brand" />
              <span>
                {clinic.name}
                <br />
                {clinic.address}
              </span>
            </p>
            <p className="flex items-start gap-3 text-lg">
              <ClockIcon className="mt-1 size-5 shrink-0 text-brand" />
              <span>
                Open {hours}
                <br />
                <span className="text-base text-muted">Specialists sit on their OPD days only.</span>
              </span>
            </p>
            <div className="flex flex-col gap-3">
              <a
                href={`tel:${clinic.phone}`}
                className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-brand px-6 text-lg font-semibold text-white hover:bg-brand-dark"
              >
                <PhoneIcon /> Call {clinic.phoneDisplay}
              </a>
              <a
                href={`https://wa.me/${clinic.whatsapp}`}
                className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl border border-line px-6 text-lg font-semibold hover:border-brand"
              >
                <ChatIcon /> WhatsApp {clinic.whatsappDisplay}
              </a>
              <a
                href={clinic.mapUrl}
                className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl border border-line px-6 text-lg font-semibold hover:border-brand"
              >
                <MapPinIcon /> Get directions
              </a>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="overflow-hidden rounded-2xl border border-line">
              <iframe
                src={clinic.mapEmbedUrl}
                title={`Map: ${clinic.landmark.name}, opposite ${clinic.name}`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="block h-80 w-full border-0"
              />
            </div>
            <p className="text-base text-muted">
              The pin shows {clinic.landmark.name}. {clinic.name} is directly opposite.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
