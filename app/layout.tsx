import type { Metadata, Viewport } from "next";
import { clinic } from "@/data/clinic";
import { SiteHeader } from "@/components/SiteHeader";
import { QuickActions, SiteFooter } from "@/components/SiteChrome";
import "./globals.css";

const description = `Book a specialist at ${clinic.name}, ${clinic.address}. Dermatology, psychiatry, general medicine, neurosurgery, ultrasound, echo, lab and pharmacy. Consultation ₹${clinic.consultationFee}.`;

export const metadata: Metadata = {
  metadataBase: new URL(clinic.siteUrl),
  title: { default: `${clinic.name}, Sopore | Book a specialist`, template: `%s | ${clinic.name}, Sopore` },
  description,
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: clinic.name,
    title: `${clinic.name}, Sopore`,
    description,
    url: "/",
  },
  formatDetection: { telephone: true },
};

export const viewport: Viewport = {
  themeColor: "#0F766E",
};

// Tells Google this is a medical clinic, with its address and phone (schema.org).
const structuredData = {
  "@context": "https://schema.org",
  "@type": "MedicalClinic",
  name: clinic.name,
  url: clinic.siteUrl,
  telephone: clinic.phone,
  founder: { "@type": "Person", name: clinic.founder },
  address: {
    "@type": "PostalAddress",
    streetAddress: clinic.address.replace(/, Sopore$/, ""),
    addressLocality: "Sopore",
    addressRegion: "Jammu and Kashmir",
    addressCountry: "IN",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1 pb-24 sm:pb-0">
          {children}
        </main>
        <SiteFooter />
        <QuickActions />
        <script
          type="application/ld+json"
          // JSON.stringify of our own static data; "<" escaped so it can't close the script tag.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
        />
      </body>
    </html>
  );
}
