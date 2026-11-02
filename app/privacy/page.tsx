// Privacy notice. States only what the website actually does.
// The clinic owner should read and approve it; update "Last updated" with every change.

import type { Metadata } from "next";
import { clinic } from "@/data/clinic";

export const metadata: Metadata = {
  alternates: { canonical: "/privacy" },
  title: "Privacy notice",
  description: `How ${clinic.name} handles the details you share when you book an appointment.`,
};

const LAST_UPDATED = "2 November 2026";

export default function PrivacyPage() {
  const tel = `tel:${clinic.phone}`;
  return (
    <>
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 pt-8 pb-24 sm:py-12">
        <div className="card rounded-2xl border border-line bg-white p-6 sm:p-10 shadow-card">
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-ink font-display">Privacy Notice</h1>
          <p className="mt-1 text-xs text-muted">Last updated {LAST_UPDATED} · Eternal Polyclinic Sopore</p>

          <div className="mt-8 flex flex-col gap-8 text-xs sm:text-sm text-charcoal leading-relaxed [&_h2]:mb-2.5 [&_h2]:text-base sm:[&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-ink [&_h2]:font-display [&_li]:mt-1 [&_ul]:list-disc [&_ul]:pl-5">
            <section>
              <h2>In short</h2>
              <p>
                To book, you share your name, mobile number, the doctor, and the day and time you want. You send this to
                us yourself on WhatsApp. We use it only to arrange your appointment. We never ask why you are visiting.
              </p>
            </section>

          <section>
            <h2>Who we are</h2>
            <p>
              {clinic.name}, {clinic.address}. For any question about your details, call{" "}
              <a href={tel} className="font-semibold text-brand underline whitespace-nowrap">
                {clinic.phoneDisplay}
              </a>{" "}
              or WhatsApp{" "}
              <a href={`https://wa.me/${clinic.whatsapp}`} className="font-semibold text-brand underline whitespace-nowrap">
                {clinic.whatsappDisplay}
              </a>
              .
            </p>
          </section>

          <section>
            <h2>What the booking form collects</h2>
            <ul>
              <li>Your name and mobile number</li>
              <li>The doctor you chose, and the day and time you want</li>
            </ul>
            <p className="mt-3">
              The website does not store these. When you press &quot;Send request on WhatsApp&quot;, they are put into a
              WhatsApp message on your own phone. We receive them only if you press Send in WhatsApp. Nothing is saved
              in your browser. Once sent, the message stays in the WhatsApp chat on your phone and on the clinic&apos;s
              phone, like any WhatsApp message; you can delete it from your side at any time.
            </p>
          </section>

          <section>
            <h2>Visitor statistics</h2>
            <p>
              To see which pages people look at, the website counts page visits with Cloudflare Web Analytics. It uses no
              cookies and stores nothing on your device, does not follow you across other websites, and never records
              anything you type, including search words. It counts the pages viewed, the website that sent you here,
              your country, and your device and browser type, and only as totals.
            </p>
          </section>

          <section>
            <h2>How we use your details</h2>
            <p>
              Only to arrange and confirm your appointment, which usually means calling you on the number you gave. We
              do not sell your details or use them for advertising.
            </p>
          </section>

          <section>
            <h2>Other services involved</h2>
            <ul>
              <li>
                <strong>WhatsApp</strong> carries your booking message, under WhatsApp&apos;s own privacy policy.
              </li>
              <li>
                <strong>Cloudflare</strong> hosts this website. It handles basic technical data, such as IP addresses, to
                deliver the pages and protect the site from attacks, and provides the visitor statistics described above.
              </li>
              <li>
                <strong>Google Maps</strong> shows the map in &quot;Visit us&quot;. Google may collect data when the map
                loads, under Google&apos;s own privacy policy.
              </li>
            </ul>
          </section>

          <section>
            <h2>Your choices</h2>
            <p>
              You can ask us what details we have from you, ask us to correct them, or ask us to delete your messages.
              Call{" "}
              <a href={tel} className="font-semibold text-brand underline whitespace-nowrap">
                {clinic.phoneDisplay}
              </a>{" "}
              or WhatsApp{" "}
              <a href={`https://wa.me/${clinic.whatsapp}`} className="font-semibold text-brand underline whitespace-nowrap">
                {clinic.whatsappDisplay}
              </a>
              . If you would rather not use WhatsApp, you can book by calling us instead.
            </p>
          </section>

          <section>
            <h2>Changes</h2>
            <p>If we change how we handle your details, we will update this page and the date at the top.</p>
          </section>
        </div>
      </div>
    </div>
  </>
);
}
