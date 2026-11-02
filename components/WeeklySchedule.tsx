"use client";

// Weekly OPD schedule: a doctor × day grid on wider screens, a day-by-day list on phones.
// The grid itself is prebuilt; WeeklySchedule adds today's highlight in the visitor's browser.

import { doctors, type Weekday } from "@/data/clinic";
import { clinicClock, DAY_NAMES, formatTimeShort, sessionOn } from "@/lib/schedule";
import { useClinicMinute } from "./useClinicMinute";

const WEEK: Weekday[] = [1, 2, 3, 4, 5, 6, 0]; // Monday first
const confirmed = doctors.filter((d) => d.opd.length > 0);
const unconfirmed = doctors.filter((d) => d.opd.length === 0);

export function ScheduleView({ today }: { today?: Weekday }) {
  return (
    <div className="flex flex-col gap-4">
      {/* Wider screens: grid */}
      <div className="card hidden overflow-x-auto rounded-2xl border border-line bg-white shadow-card md:block">
        <table className="w-full min-w-[46rem] table-fixed border-collapse text-xs sm:text-sm">
          <caption className="sr-only">Weekly OPD schedule by doctor and day</caption>
          <thead>
            <tr className="bg-ground border-b border-line text-left">
              <th scope="col" className="w-52 px-5 py-3.5 font-bold text-ink uppercase tracking-wider text-[11px]">Doctor</th>
              {WEEK.map((day) => (
                <th
                  key={day}
                  scope="col"
                  className={`px-3 py-3.5 font-bold uppercase tracking-wider text-[11px] ${day === today ? "bg-brand-tint text-brand border-x border-brand-line/60" : "text-charcoal"}`}
                >
                  {DAY_NAMES[day].slice(0, 3)}
                  {day === today && <span className="block text-[10px] font-extrabold text-brand mt-0.5">Today</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {confirmed.map((doctor) => (
              <tr key={doctor.id} className="border-t border-line/70 hover:bg-ground/30 transition-colors">
                <th scope="row" className="px-5 py-3.5 text-left font-normal">
                  <span className="block font-bold text-ink">{doctor.name ?? doctor.speciality}</span>
                  <span className="block text-xs text-muted mt-0.5">{doctor.speciality}</span>
                </th>
                {WEEK.map((day) => {
                  const s = sessionOn(doctor, day);
                  return (
                    <td key={day} className={`px-3 py-3.5 align-middle ${day === today ? "bg-brand-tint/50 border-x border-brand-line/40" : ""}`}>
                      {s ? (
                        <span className="font-semibold text-brand text-xs sm:text-sm tabular-nums">
                          {formatTimeShort(s.start)}–<wbr />
                          {formatTimeShort(s.end)}
                          {s.recurrence === "first-of-month" && (
                            <span className="block text-[10px] font-semibold text-muted">1st of mo</span>
                          )}
                          {s.recurrence === "alternate" && (
                            <span className="block text-[10px] font-semibold text-muted">Alt week</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-stone select-none" aria-label="Not sitting">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phones: one compact row per day inside a single card */}
      <ul className="card divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-card md:hidden">
        {WEEK.map((day) => {
          const sittings = confirmed.flatMap((d) => {
            const s = sessionOn(d, day);
            return s ? [{ doctor: d, s }] : [];
          });
          const isToday = day === today;
          return (
            <li key={day} className={`flex gap-3 px-4 py-3 text-base ${isToday ? "bg-brand-tint" : ""}`}>
              <span className="w-12 shrink-0 font-bold">
                {DAY_NAMES[day].slice(0, 3)}
                {isToday && <span className="block text-xs font-semibold text-brand">Today</span>}
              </span>
              {sittings.length > 0 ? (
                <ul className="flex flex-1 flex-col divide-y divide-line/60">
                  {sittings.map(({ doctor, s }, idx) => (
                    <li key={doctor.id} className={`flex flex-col py-1 ${idx === 0 ? "pt-0" : ""}`}>
                      <span className="font-semibold text-ink leading-snug">{doctor.name ?? doctor.speciality}</span>
                      <span className="text-xs text-muted tabular-nums">
                        {formatTimeShort(s.start)}–{formatTimeShort(s.end)}
                        {s.recurrence === "first-of-month" ? " (1st of month)" : s.recurrence === "alternate" ? " (Alternate week)" : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="self-center text-muted">—<span className="sr-only">No visiting specialist</span></span>
              )}
            </li>
          );
        })}
      </ul>

      {unconfirmed.length > 0 && (
        <p className="text-muted">
          Timings for the {unconfirmed.map((d) => d.speciality.toLowerCase()).join(" and ")} are coming soon. Call to
          ask.
        </p>
      )}
    </div>
  );
}

/** Highlights today's column, worked out in the visitor's browser (the prebuilt page shows no highlight). */
export function WeeklySchedule() {
  const minute = useClinicMinute();
  return <ScheduleView today={minute === null ? undefined : clinicClock(new Date(minute)).weekday} />;
}
