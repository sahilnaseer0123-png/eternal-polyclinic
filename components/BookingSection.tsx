"use client";

// Gives the booking form the visitor's own clock and the doctor from /book?doctor=<id>.
// Runs in the browser: the prebuilt page holds BookingSkeleton (same height), so days and slots are
// never frozen at build time (CLAUDE.md rule 3). useSearchParams needs the <Suspense> in app/book/page.tsx.

import { useSearchParams } from "next/navigation";
import { doctors } from "@/data/clinic";
import { BookingForm } from "./BookingForm";
import { useClinicMinute } from "./useClinicMinute";

export function BookingSection() {
  const requested = useSearchParams().get("doctor") ?? "";
  const minute = useClinicMinute();
  if (minute === null) return <BookingSkeleton />;
  const initialDoctorId = doctors.some((d) => d.id === requested) ? requested : "";
  return <BookingForm key={initialDoctorId} nowMs={minute} initialDoctorId={initialDoctorId} />;
}

export function BookingSkeleton() {
  // Same height as the empty form, so the page doesn't jump when the form appears.
  return <div className="card h-[44.5rem] animate-pulse rounded-3xl sm:h-[40rem]" aria-busy="true" />;
}
