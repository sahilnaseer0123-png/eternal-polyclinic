"use client";

// Cookie-free page-view counts (Vercel Web Analytics), so the clinic can see which pages and doctors
// people look at. Nothing is tied to a person. Search words are removed first (lib/analytics.ts).
// Counting only starts once Analytics is switched on for the project in the Vercel dashboard.

import { Analytics } from "@vercel/analytics/next";
import { cleanAnalyticsUrl } from "@/lib/analytics";

export function SiteAnalytics() {
  return <Analytics beforeSend={(event) => ({ ...event, url: cleanAnalyticsUrl(event.url) })} />;
}
