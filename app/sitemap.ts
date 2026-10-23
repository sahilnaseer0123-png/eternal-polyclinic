import type { MetadataRoute } from "next";
import { clinic, doctors } from "@/data/clinic";

// Built once into out/ for the static site.
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: clinic.siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${clinic.siteUrl}/doctors`, changeFrequency: "weekly", priority: 0.9 },
    ...doctors.map((d) => ({ url: `${clinic.siteUrl}/doctors/${d.id}`, changeFrequency: "weekly" as const, priority: 0.8 })),
    { url: `${clinic.siteUrl}/book`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${clinic.siteUrl}/services`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${clinic.siteUrl}/faq`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${clinic.siteUrl}/contact`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${clinic.siteUrl}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
