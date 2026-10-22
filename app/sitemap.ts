import type { MetadataRoute } from "next";
import { clinic } from "@/data/clinic";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: clinic.siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${clinic.siteUrl}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
