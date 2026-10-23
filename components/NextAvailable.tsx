"use client";

// "Next: Tomorrow, 4:00 pm" for one doctor, worked out in the visitor's browser in clinic time.
// Until it's known (prerender), it shows `fallback` (usually the doctor's days) on the same single line,
// so nothing moves when it switches.

import { doctors } from "@/data/clinic";
import { nextSlot, slotLabel } from "@/lib/schedule";
import { useClinicMinute } from "./useClinicMinute";

export function NextAvailable({
  doctorId,
  fallback,
  prefix = "Next: ",
  short = false,
  className = "",
}: {
  doctorId: string;
  fallback: string;
  prefix?: string;
  short?: boolean;
  className?: string;
}) {
  const minute = useClinicMinute();
  const doctor = doctors.find((d) => d.id === doctorId);
  const slot = doctor && minute !== null ? nextSlot(doctor, new Date(minute)) : null;
  return <span className={className}>{slot && minute !== null ? `${prefix}${slotLabel(slot, new Date(minute), short)}` : fallback}</span>;
}
