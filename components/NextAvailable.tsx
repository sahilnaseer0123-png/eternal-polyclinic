"use client";

// "Next: Tomorrow, 4:00 pm" for one doctor, worked out in the visitor's browser in clinic time.
// Until it's known (prerender), it shows `fallback` (usually the doctor's days) on the same single line,
// so nothing moves when it switches.

import { doctors } from "@/data/clinic";
import { addDays, clinicClock, dateLabel, formatTime, nextSlot, slotLabel } from "@/lib/schedule";
import { useClinicMinute } from "./useClinicMinute";

export function NextAvailable({
  doctorId,
  fallback,
  prefix = "Next: ",
  short = false,
  full = false,
  className = "",
}: {
  doctorId: string;
  fallback: string;
  prefix?: string;
  short?: boolean;
  full?: boolean;
  className?: string;
}) {
  const minute = useClinicMinute();
  const doctor = doctors.find((d) => d.id === doctorId);
  const slot = doctor && minute !== null ? nextSlot(doctor, new Date(minute)) : null;

  if (!slot || minute === null) {
    return <span className={className}>{fallback}</span>;
  }

  if (full) {
    const today = clinicClock(new Date(minute)).dateKey;
    const rel = slot.date === today ? "Today" : slot.date === addDays(today, 1) ? "Tomorrow" : null;
    const text = rel
      ? `${rel} (${dateLabel(slot.date)}) at ${formatTime(slot.time)}`
      : `${dateLabel(slot.date)} at ${formatTime(slot.time)}`;
    return <span className={className}>{prefix}{text}</span>;
  }

  return <span className={className}>{prefix}{slotLabel(slot, new Date(minute), short)}</span>;
}
