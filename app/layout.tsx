import type { Metadata, Viewport } from "next";
import { clinic } from "@/data/clinic";
import { SiteHeader } from "@/components/SiteHeader";
import { QuickActions, SiteFooter } from "@/components/SiteChrome";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import { clinicSchema, jsonLd } from "@/lib/structured-data";
import { SiteAnalytics } from "@/components/SiteAnalytics";
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


export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-scroll-behavior: globals.css scrolls smoothly for in-page links; this tells Next.js 16 to switch that off
    // while it jumps to the top of a new page. Without it, new pages landed ~100px down, title under the header.
    <html lang="en" className="h-full antialiased" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        {/* Marks the page ready for scroll fade-ins before anything paints (see globals.css). */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('reveal-ready')" }} />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1 pb-20 lg:pb-0">
          {children}
        </main>
        <SiteFooter />
        <QuickActions />
        <RevealOnScroll />
        <SiteAnalytics />
        {/* Tells Google this is a medical clinic: address, map, hours, specialities, booking (lib/structured-data.ts). */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(clinicSchema()) }} />
      </body>
    </html>
  );
}
