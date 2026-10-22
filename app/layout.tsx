import type { Metadata, Viewport } from "next";
import { clinic } from "@/data/clinic";
import "./globals.css";

const description = `Book a specialist at ${clinic.name}, ${clinic.address}. Dermatology, psychiatry, general medicine, neurosurgery, ultrasound, echo, lab and pharmacy. Consultation ₹${clinic.consultationFee}.`;

export const metadata: Metadata = {
  metadataBase: new URL(clinic.siteUrl),
  title: `${clinic.name}, Sopore | Book a specialist`,
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
        {children}
        <script
          type="application/ld+json"
          // JSON.stringify of our own static data; "<" escaped so it can't close the script tag.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
        />
      </body>
    </html>
  );
}
