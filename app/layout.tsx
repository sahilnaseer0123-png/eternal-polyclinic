import type { Metadata } from "next";
import { clinic } from "@/data/clinic";
import "./globals.css";

export const metadata: Metadata = {
  title: `${clinic.name}, Sopore | Book a specialist`,
  description: `Book a specialist at ${clinic.name}, ${clinic.address}. Dermatology, psychiatry, general medicine, neurosurgery, ultrasound, echo, lab and pharmacy. Open 7 am to 8 pm.`,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
