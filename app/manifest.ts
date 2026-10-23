// Lets patients add the site to their phone's home screen; it then opens full-screen like an app.
// Icons in public/icons/ are rendered from brand/logo.svg (regenerate if the logo changes).

import type { MetadataRoute } from "next";
import { clinic } from "@/data/clinic";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${clinic.name}, Sopore`,
    short_name: "Eternal",
    description: `Book a visiting specialist at ${clinic.name}, ${clinic.address}.`,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4f6f5",
    theme_color: "#0f766e",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Book a doctor", url: "/book" },
      { name: "Doctors and days", url: "/doctors" },
    ],
  };
}
