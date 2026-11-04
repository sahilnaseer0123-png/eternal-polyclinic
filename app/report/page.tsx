// /report/#<token>: a patient opens their lab report from the WhatsApp link (see components/ReportViewer.tsx).
// Never indexed; the token stays in the URL fragment so it isn't sent to any server log.

import type { Metadata } from "next";
import { ReportViewer } from "@/components/ReportViewer";

export const metadata: Metadata = {
  title: "Your lab report",
  description: "Open your lab report securely.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function ReportPage() {
  return (
    <section className="bg-ground">
      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-6 sm:py-16">
        <ReportViewer />
      </div>
    </section>
  );
}
