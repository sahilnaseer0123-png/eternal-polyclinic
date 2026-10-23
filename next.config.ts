import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build the whole site as ready-made files in out/ for Cloudflare Pages (free, business use allowed).
  // Anything that depends on today's date runs in the visitor's browser (useClinicMinute).
  output: "export",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
