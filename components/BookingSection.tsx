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
  return (
    <div className="card rounded-3xl p-6 sm:p-8 flex flex-col gap-6" aria-busy="true" aria-label="Loading booking form">
      <div className="flex items-center justify-between">
        <div className="h-3 w-24 animate-pulse rounded bg-stone" />
        <div className="h-1.5 w-24 animate-pulse rounded-full bg-stone" />
      </div>
      <div>
        <div className="h-8 w-48 animate-pulse rounded bg-stone" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-stone" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center gap-3.5 rounded-2xl border border-line bg-white p-3.5">
            <div className="size-11 shrink-0 animate-pulse rounded-xl bg-stone" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-32 animate-pulse rounded bg-stone" />
              <div className="h-3 w-20 animate-pulse rounded bg-stone" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
