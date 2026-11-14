"use client";

// Live arrival, delay, cancellation, or leave pill shown on static doctor profile pages (/doctors/[id]).
// Hydrates from GET /api/live in the visitor's browser without writing to localStorage.

import { isDoctorOnLeave, useActiveDoctors, useDoctorStatuses } from "@/lib/appointments";

export function DoctorLiveBadge({ doctorId }: { doctorId: string }) {
  const activeDoctors = useActiveDoctors();
  const statuses = useDoctorStatuses();
  const doc = activeDoctors.find((d) => d.id === doctorId);
  const onLeave = doc ? isDoctorOnLeave(doc) : false;
  const live = statuses[doctorId];

  if (onLeave && doc?.availability) {
    return (
      <span className="inline-flex items-center rounded-md bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-800">
        {doc.availability}
      </span>
    );
  }

  if (live?.state === "in_clinic") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-brand-tint border border-brand-line px-3 py-1 text-xs font-bold text-ink">
        <span className="size-1.5 rounded-full bg-[#22A05B]" aria-hidden="true" />
        In Clinic Today
      </span>
    );
  }

  if (live?.state === "delayed") {
    return (
      <span className="inline-flex items-center rounded-md bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-800">
        Delayed ~{live.delayMinutes ?? 30}m{live.note ? ` · ${live.note}` : ""}
      </span>
    );
  }

  if (live?.state === "cancelled") {
    return (
      <span className="inline-flex items-center rounded-md bg-red-50 border border-red-200 px-3 py-1 text-xs font-bold text-red-800">
        Today&rsquo;s OPD Cancelled
      </span>
    );
  }

  return null;
}

