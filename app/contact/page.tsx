import type { Metadata } from "next";
import { clinic } from "@/data/clinic";
import { formatTime } from "@/lib/schedule";
import { PageIntro } from "@/components/SiteChrome";
import { ChatIcon, ClockIcon, MapPinIcon, PhoneIcon } from "@/components/Icons";
import { EmergencyNote } from "@/components/EmergencyNote";
import { ReceptionPhoto } from "@/components/ClinicPhoto";

export const metadata: Metadata = {
  alternates: { canonical: "/contact" },
  title: "Contact and directions",
  description: `${clinic.name}, ${clinic.address}. Call ${clinic.phoneDisplay}, WhatsApp ${clinic.whatsappDisplay}.`,
};

const hours = `${formatTime(clinic.hours.open)} – ${formatTime(clinic.hours.close)}`;

export default function ContactPage() {
  return (
    <>
      <PageIntro title="Visit us" />
      <div className="mx-auto max-w-6xl px-5 pb-5">
        <EmergencyNote />
      </div>
      <section
        aria-label="Address and contact"
        className="mx-auto max-w-6xl px-5 pb-16"
      >
        <div className="grid gap-8 card rounded-3xl p-6 sm:p-10 md:grid-cols-2 border border-line/70">
          <div className="flex flex-col gap-5">
            <figure>
              <ReceptionPhoto
                className="aspect-[3/2] rounded-2xl shadow-sm border border-line/60"
                eager
                sizes="(min-width: 1152px) 500px, (min-width: 768px) 45vw, 100vw"
              />
              <figcaption className="mt-2 text-sm text-muted">
                Our reception &amp; triage desk inside the clinic.
              </figcaption>
            </figure>
            <div className="rounded-2xl bg-ground p-4 flex flex-col gap-3.5 border border-line/60">
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand">
                  <MapPinIcon className="size-5" />
                </span>
                <div className="text-sm">
                  <strong className="block font-bold text-ink">{clinic.name}</strong>
                  <span className="text-slate-600">{clinic.address}</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand">
                  <ClockIcon className="size-5" />
                </span>
                <div className="text-sm">
                  <strong className="block font-bold text-ink">Clinic Open Hours: {hours}</strong>
                  <span className="text-slate-600">Specialists consult strictly according to their weekly OPD roster.</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <a
                href={`tel:${clinic.phone}`}
                className="inline-flex min-h-13 items-center justify-center gap-2.5 rounded-2xl bg-brand px-6 text-base font-bold text-white hover:bg-brand-dark shadow-md transition-all"
              >
                <span className="relative flex size-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-glow opacity-75"></span>
                  <span className="relative inline-flex size-2.5 rounded-full bg-glow"></span>
                </span>
                <PhoneIcon className="size-5" /> Call Helpline: {clinic.phoneDisplay}
              </a>
              <a
                href={`https://wa.me/${clinic.whatsapp}`}
                className="inline-flex min-h-13 items-center justify-center gap-2 card card-hover rounded-2xl px-6 text-base font-bold text-slate-800 border border-line/70 hover:text-brand"
              >
                <ChatIcon className="size-5 text-emerald-600" /> WhatsApp Direct: {clinic.whatsappDisplay}
              </a>
              <a
                href={clinic.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-13 items-center justify-center gap-2 card card-hover rounded-2xl px-6 text-base font-bold text-slate-800 border border-line/70 hover:text-brand"
              >
                <MapPinIcon className="size-5 text-brand" /> Get Directions on Google Maps
              </a>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="relative min-h-[22rem] flex-1 overflow-hidden rounded-2xl border border-line bg-ground md:min-h-[28rem] shadow-sm">
              <iframe
                src={clinic.mapEmbedUrl}
                title={`Map: ${clinic.name}, ${clinic.location.name}, Sopore`}
                width="100%"
                height="100%"
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                className="absolute inset-0 h-full w-full border-0"
              />
            </div>
            <p className="text-xs text-muted">
              Located at {clinic.location.name}, opposite Sub-District Hospital (SDH), Sopore.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
