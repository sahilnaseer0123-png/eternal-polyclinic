import type { MetadataRoute } from "next";
import { clinic } from "@/data/clinic";

// Built once into out/ for the static site.
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${clinic.siteUrl}/sitemap.xml`,
  };
}
