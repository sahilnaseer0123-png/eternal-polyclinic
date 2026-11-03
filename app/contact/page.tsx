import type { Metadata } from "next";
import { clinic } from "@/data/clinic";
import { formatTime } from "@/lib/schedule";
import { PageIntro } from "@/components/SiteChrome";
import { ChatIcon, ClockIcon, MapPinIcon, PhoneIcon, WhatsAppIcon } from "@/components/Icons";
import { EmergencyNote } from "@/components/EmergencyNote";
import { ReceptionPhoto } from "@/components/ClinicPhoto";
import { ReportCollectionSection } from "@/components/ReportCollectionSection";

export const metadata: Metadata = {
  alternates: { canonical: "/contact" },
  title: "Location & Directions | Eternal Polyclinic Sopore",
  description: `Find Eternal Polyclinic at 1st Floor, Lone Complex, Opposite SDH Hospital, Sopore. Call ${clinic.phoneDisplay} or WhatsApp ${clinic.whatsappDisplay}.`,
};

const hours = `${formatTime(clinic.hours.open)} – ${formatTime(clinic.hours.close)}`;

export default function ContactPage() {
  return (
    <>
      <PageIntro title="Visit &amp; Contact">
        Located directly opposite the Sub-District Hospital (SDH) main gate in Sopore. Readily accessible from Baramulla, Bandipora, and Kupwara.
      </PageIntro>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 pb-4">
        <EmergencyNote />
      </div>

      <section
        aria-label="Address and contact"
        className="mx-auto max-w-6xl px-4 sm:px-6 pb-24 sm:pb-16"
      >
        <div className="grid gap-8 card rounded-3xl p-6 sm:p-9 md:grid-cols-2">
          {/* Left Column: Details & Photo */}
          <div className="flex flex-col gap-6">
            <figure>
              <ReceptionPhoto
                className="aspect-[3/2] rounded-2xl object-cover"
                eager
                sizes="(min-width: 1152px) 500px, (min-width: 768px) 45vw, 100vw"
              />
              <figcaption className="mt-2 text-sm text-muted">
                Reception and patient triage lounge on the 1st Floor.
              </figcaption>
            </figure>

            {/* Address & Hours Cards */}
            <div className="rounded-xl bg-ground p-4 sm:p-5 flex flex-col gap-4 border border-line">
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-tint border border-brand-line/60 text-brand mt-0.5">
                  <MapPinIcon className="size-4.5" />
                </span>
                <div className="text-sm sm:text-base">
                  <strong className="block font-display text-lg font-medium text-ink">
                    {clinic.name}
                  </strong>
                  <span className="text-charcoal block mt-0.5 leading-relaxed">
                    {clinic.address}
                  </span>
                  <span className="text-[11px] text-muted block mt-1">
                    Landmark: Directly opposite SDH Hospital entrance, 1st Floor Lone Complex.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 border-t border-line/60 pt-3.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-tint border border-brand-line/60 text-brand mt-0.5">
                  <ClockIcon className="size-4.5" />
                </span>
                <div className="text-sm sm:text-base">
                  <strong className="block font-bold text-ink">
                    Clinic Hours: {hours} (Daily)
                  </strong>
                  <span className="text-charcoal block mt-0.5 leading-relaxed">
                    Visiting specialists consult on fixed days according to their weekly OPD roster. Ultrasound &amp; lab services run during morning hours.
                  </span>
                </div>
              </div>
            </div>

            {/* Department Quick Direct Directory */}
            <div className="rounded-2xl border border-line bg-ground/60 p-4">
              <span className="eyebrow text-muted block mb-2">Direct Phone Directory</span>
              <dl className="grid gap-2 text-xs sm:text-sm">
                <div className="flex items-center justify-between py-1 border-b border-line/60">
                  <dt className="text-charcoal font-medium">Reception &amp; Pharmacy</dt>
                  <dd className="font-bold text-ink">
                    <a href={`tel:${clinic.pharmacyPhone}`} className="hover:text-brand transition-colors">
                      {clinic.pharmacyPhoneDisplay}
                    </a>
                  </dd>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-line/60">
                  <dt className="text-charcoal font-medium">Owner &amp; WhatsApp Desk</dt>
                  <dd className="font-bold text-ink">
                    <a href={`https://wa.me/${clinic.whatsapp}`} target="_blank" rel="noopener noreferrer" className="hover:text-brand transition-colors">
                      {clinic.whatsappDisplay}
                    </a>
                  </dd>
                </div>
                <div className="flex items-center justify-between py-1">
                  <dt className="text-charcoal font-medium">Lab Tech (Musadiq Ahmad)</dt>
                  <dd className="font-bold text-ink">
                    <a href={`tel:${clinic.labTechPhone}`} className="hover:text-brand transition-colors">
                      {clinic.labTechPhoneDisplay}
                    </a>
                  </dd>
                </div>
              </dl>
            </div>

            {/* Direct Action Buttons */}
            <div className="flex flex-col gap-2.5">
              <a
                href={`tel:${clinic.phone}`}
                className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-xl bg-brand px-6 text-sm sm:text-base font-bold text-white hover:bg-brand-dark transition-colors"
              >
                <PhoneIcon className="size-4 shrink-0" />
                <span>Call Reception &amp; Pharmacy: {clinic.phoneDisplay}</span>
              </a>

              <a
                href={`https://wa.me/${clinic.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 text-sm sm:text-base font-bold text-white hover:bg-[#20ba59]"
              >
                <ChatIcon className="size-4 shrink-0" />
                <span>WhatsApp Owner Desk: {clinic.whatsappDisplay}</span>
              </a>

              <a
                href={`tel:${clinic.labTechPhone}`}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line-strong bg-white px-6 text-sm sm:text-base font-bold text-charcoal hover:border-brand hover:text-brand transition-colors"
              >
                <PhoneIcon className="size-4 text-brand shrink-0" />
                <span>Call Lab Tech: {clinic.labTechPhoneDisplay}</span>
              </a>

              <a
                href={clinic.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-[1.5px] border-ink px-6 text-sm sm:text-base font-bold hover:bg-ink hover:text-white"
              >
                <MapPinIcon className="size-4 text-brand shrink-0" />
                <span>Open in Google Maps App ↗</span>
              </a>

              <a
                href={clinic.locationShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line-strong bg-white px-6 text-sm sm:text-base font-bold text-charcoal hover:border-[#25D366] hover:text-brand transition-colors"
              >
                <WhatsAppIcon className="size-4.5 text-[#25D366] shrink-0" />
                <span>Share Location on WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Right Column: Interactive Map */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between pb-1">
              <span className="eyebrow text-muted">
                Interactive Clinic Location
              </span>
              <a
                href={clinic.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-brand underline"
              >
                Full Screen Map ↗
              </a>
            </div>

            <div className="relative min-h-[22rem] flex-1 overflow-hidden rounded-2xl border border-line bg-ground md:min-h-[28rem]">
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
            <p className="text-[11px] text-muted leading-relaxed">
              Coordinates: {clinic.location.lat}, {clinic.location.lng}. Street parking is accessible along the SDH Hospital road.
            </p>
          </div>
        </div>

        {/* Digital Lab & Scan Reports on WhatsApp */}
        <ReportCollectionSection className="mt-8" />
      </section>
    </>
  );
}
