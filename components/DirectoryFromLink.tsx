"use client";

// Reads ?type=skin (shared links open with that speciality chosen) and ?q= (the home page search box)
// in the browser. useSearchParams needs the <Suspense> in app/doctors/page.tsx; its fallback, the full
// list, is what the prebuilt page holds.

import { useSearchParams } from "next/navigation";
import { isCategory } from "@/data/clinic";
import { DoctorDirectory } from "./DoctorDirectory";

export function DirectoryFromLink() {
  const params = useSearchParams();
  const type = params.get("type");
  const initialFilter = isCategory(type) ? type : "all";
  const initialQuery = (params.get("q") ?? "").slice(0, 60);
  return <DoctorDirectory key={`${initialFilter}|${initialQuery}`} initialFilter={initialFilter} initialQuery={initialQuery} />;
}
