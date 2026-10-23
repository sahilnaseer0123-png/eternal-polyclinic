// Privacy notice. States only what the website actually does.
// The clinic owner should read and approve it; update "Last updated" with every change.

import type { Metadata } from "next";
import { clinic } from "@/data/clinic";

export const metadata: Metadata = {
  title: "Privacy notice",
  description: `How ${clinic.name} handles the details you share when you book an appointment.`,
};

const LAST_UPDATED = "23 October 2026";

export default function PrivacyPage() {
  const tel = `tel:${clinic.phone}`;
  return (
    <>
      <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:py-12">
        <h1 className="text-[2rem] font-bold leading-tight sm:text-4xl">Privacy notice</h1>
        <p className="mt-2 text-muted">Last updated {LAST_UPDATED}</p>

        <div className="mt-10 flex flex-col gap-10 [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-bold [&_li]:mt-1 [&_ul]:list-disc [&_ul]:pl-6">
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
              <a href={tel} className="font-semibold text-brand underline">
                {clinic.phoneDisplay}
              </a>{" "}
              or WhatsApp{" "}
              <a href={`https://wa.me/${clinic.whatsapp}`} className="font-semibold text-brand underline">
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
              in your browser.
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
                <strong>Vercel</strong> hosts this website and keeps basic technical logs, such as IP addresses, for
                security and to keep the site running.
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
              Call {clinic.phoneDisplay} or WhatsApp {clinic.whatsappDisplay}. If you would rather not use WhatsApp,
              you can book by calling us instead.
            </p>
          </section>

          <section>
            <h2>Changes</h2>
            <p>If we change how we handle your details, we will update this page and the date at the top.</p>
          </section>
        </div>
      </div>
    </>
  );
}
