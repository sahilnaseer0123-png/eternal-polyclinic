"use client";

// "Sits at the clinic" list on /doctors/[id]. The page is prebuilt, so the built-in schedule is drawn first;
// once the browser has the clinic's live data, it shows the days the admin set (new days, leave dates),
// so the doctor page never disagrees with the Specialists section or the booking form.

import type { Doctor } from "@/data/clinic";
import { isDoctorOnLeave, useActiveDoctors } from "@/lib/appointments";
import { DAY_NAMES, formatTime } from "@/lib/schedule";
import { CalendarIcon } from "./Icons";

export function DoctorSittings({ doctor: built }: { doctor: Doctor }) {
  const active = useActiveDoctors();
  const doctor = active.find((d) => d.id === built.id) ?? built;
  const onLeave = isDoctorOnLeave(doctor);

  return (
    <>
      {onLeave && (
        <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-sm font-semibold text-rose-900">
          {doctor.availability}. Online booking is paused; call reception for the next sitting.
        </p>
      )}
      {doctor.opd.length > 0 ? (
        <ul className="mt-3 flex flex-col divide-y divide-line">
          {doctor.opd.map((s) => (
            <li key={`${s.day}-${s.start}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
              <span className="flex items-center gap-2 font-display text-xl font-medium tracking-tight">
                <CalendarIcon className="size-4 shrink-0 text-brand" />
                {s.recurrence === "first-of-month"
                  ? `1st ${DAY_NAMES[s.day]} of month`
                  : s.recurrence === "alternate"
                    ? `Alternate ${DAY_NAMES[s.day]}s`
                    : `${DAY_NAMES[s.day]}s`}
              </span>
              <span className="text-base font-semibold text-charcoal tabular-nums lining-nums">
                {formatTime(s.start)} – {formatTime(s.end)}
              </span>
              {s.recurrence === "alternate" && (
                <span className="w-full text-sm text-muted">Call reception to confirm which week.</span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-base text-charcoal leading-relaxed">
          {onLeave
            ? "Call reception and we will arrange your slot."
            : (doctor.availability ??
              "Consultation by prior appointment. Please call reception and we will arrange your slot.")}
        </p>
      )}
    </>
  );
}

/** Doctors with no fixed sitting days, read live so a doctor the admin gives days to moves to the day picker. */
export function useByAppointmentDoctors(): Doctor[] {
  return useActiveDoctors().filter((d) => d.opd.length === 0);
}
