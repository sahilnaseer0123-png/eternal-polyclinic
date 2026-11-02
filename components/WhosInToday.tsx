"use client";

// "Who's in today" (design C dark card): worked out in the visitor's browser, in clinic time (Asia/Kolkata),
// and refreshed every minute. The prebuilt page holds WhosInTodaySkeleton (same size), so the day is never
// frozen at build time (CLAUDE.md rule 3) and nothing jumps when the real card appears.

import Link from "next/link";
import { clinic, doctors } from "@/data/clinic";
import {
  addDays,
  clinicClock,
  DAY_NAMES,
  doctorsInToday,
  formatTime,
  formatTimeShort,
  isOpenNow,
  nextSpecialist,
  sessionOn,
  sessionStatus,
  timeSlots,
  weekdayOf,
} from "@/lib/schedule";
import { useDoctorStatuses } from "@/lib/appointments";
import { DoctorMark } from "./DoctorMark";
import { useClinicMinute } from "./useClinicMinute";

const STATUS_TEXT = {
  upcoming: (start: string) => `Starts at ${formatTime(start)}`,
  in: () => "In the clinic now",
  done: () => "Finished for today",
} as const;

// The card fills in on the visitor's device. Crisp clinical medical surface (MedScan-inspired):
// Clean white background, hospital slate text, emerald live status, and refined borders.
const shell =
  "w-full max-w-full min-w-0 overflow-hidden flex flex-col gap-5 rounded-3xl bg-white border border-line p-4 sm:p-7 shadow-sm text-ink";
const primaryButton =
  "flex min-h-12 w-full max-w-full items-center justify-center rounded-2xl bg-brand px-3 py-2 text-center text-sm font-bold leading-snug text-white transition-all hover:bg-brand-dark shadow-sm sm:px-4 sm:py-2.5 sm:text-base";

export function WhosInToday() {
  const minute = useClinicMinute();
  const doctorStatuses = useDoctorStatuses();

  if (minute === null) return <WhosInTodaySkeleton />;
  const now = new Date(minute);
  const clock = clinicClock(now);
  const today = doctorsInToday(doctors, now);
  const next = nextSpecialist(doctors, now);
  const open = isOpenNow(clinic.hours, now);

  // The next 7 days that have a specialist, starting today.
  const week = Array.from({ length: 7 }, (_, i) => addDays(clock.dateKey, i)).flatMap((dateKey, i) => {
    const day = weekdayOf(dateKey);
    return doctors.flatMap((doctor) => {
      const s = sessionOn(doctor, day, dateKey);
      if (!s) return [];
      const label = i === 0 ? "Today" : i === 1 ? "Tomorrow" : DAY_NAMES[day].slice(0, 3);
      return [{ key: `${dateKey}-${doctor.id}`, label, doctor, s, isToday: i === 0 }];
    });
  });

  return (
    <div className={shell}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line pb-3.5">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <h2 id="today" className="text-sm font-bold uppercase tracking-wider text-brand">
            Today&apos;s OPD Schedule · {DAY_NAMES[clock.weekday]}
          </h2>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-ground px-3 py-1 text-xs font-semibold text-muted border border-line/60">
          <span className={`size-1.5 rounded-full ${open ? "bg-emerald-500" : "bg-slate-400"}`} />
          {open ? `Open until ${formatTime(clinic.hours.close)}` : `Opens ${formatTime(clinic.hours.open)}`}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8 lg:divide-x lg:divide-line min-w-0 max-w-full w-full">
        {/* Left: Active doctor(s) or next upcoming doctor */}
        <div className="flex flex-col justify-between gap-4 min-w-0 max-w-full w-full">
          {today.length > 0 ? (
            <ul className="flex flex-col gap-4 min-w-0 max-w-full w-full">
              {today.map(({ doctor, session }) => {
                const status = sessionStatus(session, now);
                const live = doctorStatuses[doctor.id];
                const slotsLeftToday = timeSlots(doctor, clock.dateKey, now).length > 0;
                return (
                  <li key={doctor.id} className="flex flex-col gap-3 sm:gap-4 min-w-0 max-w-full w-full bg-ground/50 p-3 sm:p-4 rounded-2xl border border-line/60">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 w-full">
                      <DoctorMark doctor={doctor} className="size-12 shrink-0 rounded-2xl text-lg sm:size-16 sm:text-2xl" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-bold tracking-tight text-ink sm:text-xl">{doctor.name ?? doctor.speciality}</p>
                        <div className="text-xs text-muted sm:text-sm">
                          <p className="truncate font-medium">
                            {doctor.speciality} · {formatTime(session.start)} – {formatTime(session.end)}
                          </p>
                          {session.recurrence === "first-of-month" && (
                            <span className="mt-1 inline-block rounded-md bg-brand-tint px-2 py-0.5 text-xs font-semibold text-brand">
                              1st of month
                            </span>
                          )}
                          {session.recurrence === "alternate" && (
                            <span className="mt-1 inline-block rounded-md bg-brand-tint px-2 py-0.5 text-xs font-semibold text-brand">
                              Alternate Fridays (Call to confirm)
                            </span>
                          )}
                        </div>
                        {live?.state === "delayed" ? (
                          <p className="mt-1 font-bold text-amber-700 text-xs sm:text-sm flex items-center gap-1.5">
                            <span className="size-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                            <span>Running ~{live.delayMinutes ?? 30}m late{live.note ? ` (${live.note})` : ""}</span>
                          </p>
                        ) : live?.state === "in_clinic" ? (
                          <p className="mt-1 font-bold text-emerald-700 text-xs sm:text-sm flex items-center gap-1.5">
                            <span className="size-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                            <span>In clinic now · Consultations active</span>
                          </p>
                        ) : live?.state === "cancelled" ? (
                          <p className="mt-1 font-bold text-rose-700 text-xs sm:text-sm flex items-center gap-1.5">
                            <span className="size-2 rounded-full bg-rose-500 shrink-0" />
                            <span>OPD cancelled today{live.note ? ` (${live.note})` : ""}</span>
                          </p>
                        ) : (
                          <p className={`mt-1 font-semibold text-xs sm:text-sm ${status === "in" ? "text-emerald-700" : "text-muted"}`}>
                            {STATUS_TEXT[status](session.start)}
                          </p>
                        )}
                      </div>
                    </div>
                    <Link href={`/book?doctor=${doctor.id}`} className={primaryButton}>
                      Book {doctor.name ?? doctor.speciality}
                      {slotsLeftToday ? " today" : ", next visit"}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col gap-4 bg-ground/50 p-4 rounded-2xl border border-line/60">
              <div>
                <p className="text-lg font-bold tracking-tight text-ink sm:text-xl">No visiting specialist scheduled today</p>
                {next && (
                  <p className="mt-3 flex flex-col gap-0.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-brand">Next Upcoming OPD</span>
                    <span className="font-bold text-ink sm:text-lg">
                      {next.doctor.name ?? next.doctor.speciality}
                      {next.doctor.name && <span className="font-normal text-muted"> ({next.doctor.speciality})</span>}
                    </span>
                    <span className="text-sm text-muted">
                      {next.daysAhead === 1 ? "Tomorrow" : DAY_NAMES[weekdayOf(addDays(clock.dateKey, next.daysAhead))]} ·{" "}
                      <span className="whitespace-nowrap font-medium text-ink">
                        {formatTimeShort(next.session.start)}–{formatTimeShort(next.session.end)}
                      </span>
                    </span>
                  </p>
                )}
              </div>
              {next && (
                <Link href={`/book?doctor=${next.doctor.id}`} className={primaryButton}>
                  Book {next.doctor.name ?? next.doctor.speciality}
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Right: This week's schedule */}
        {week.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-line pt-4 lg:border-t-0 lg:pl-8 lg:pt-0 min-w-0 max-w-full w-full">
            <div className="mb-2 flex items-baseline justify-between gap-2 min-w-0 w-full border-b border-line/60 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted">7-Day Visiting Timetable</h3>
              <Link href="/doctors#schedule" className="text-xs font-bold text-brand hover:underline">
                Full Schedule →
              </Link>
            </div>
            <ul className="flex flex-col gap-2 text-xs sm:text-sm min-w-0 max-w-full w-full">
              {week.map(({ key, label, doctor, s, isToday }) => (
                <li key={key} className={`flex items-center justify-between gap-2 min-w-0 w-full py-1.5 px-2 rounded-xl transition-colors ${isToday ? "bg-brand-tint font-bold text-brand" : "hover:bg-ground"}`}>
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className={`w-14 shrink-0 text-xs sm:w-18 ${isToday ? "font-extrabold text-brand" : "font-semibold text-muted"}`}>{label}</span>
                    <span className="min-w-0 flex-1 truncate text-ink">
                      {doctor.name ?? doctor.speciality}
                      {s.recurrence === "first-of-month" && (
                        <span className="ml-1 text-[11px] font-medium text-brand">
                          (1st/mo)
                        </span>
                      )}
                      {s.recurrence === "alternate" && (
                        <span className="ml-1 text-[11px] font-medium text-brand">
                          (Alt)
                        </span>
                      )}
                    </span>
                  </div>
                  <span className="shrink-0 text-right whitespace-nowrap tabular-nums text-xs font-semibold text-muted">
                    {formatTimeShort(s.start)}–{formatTimeShort(s.end)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export function WhosInTodaySkeleton() {
  return (
    <div className={shell} aria-busy="true">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line pb-3.5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-brand">Today&apos;s OPD Schedule</h2>
        <div className="h-4 w-36 animate-pulse rounded-md bg-slate-200" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8 lg:divide-x lg:divide-line min-w-0 max-w-full w-full">
        {/* Left column matching active doctor card */}
        <div className="flex flex-col justify-between gap-4 min-w-0 max-w-full w-full">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 w-full">
            <div className="size-12 shrink-0 animate-pulse rounded-2xl bg-slate-200 sm:size-16" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-5 w-3/4 animate-pulse rounded-md bg-slate-200" />
              <div className="h-4 w-1/2 animate-pulse rounded-md bg-slate-100" />
            </div>
          </div>
          <div className="h-12 w-full animate-pulse rounded-2xl bg-slate-200" />
        </div>
        {/* Right column matching 7-day schedule */}
        <div className="flex flex-col gap-2.5 border-t border-line pt-4 lg:border-t-0 lg:pl-8 lg:pt-0 min-w-0 max-w-full w-full">
          <div className="mb-1 flex items-baseline justify-between gap-2 min-w-0 w-full">
            <div className="h-4 w-16 animate-pulse rounded-md bg-slate-200" />
            <div className="h-4 w-20 animate-pulse rounded-md bg-slate-100" />
          </div>
          <div className="space-y-2.5 min-w-0 max-w-full w-full">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="flex items-center justify-between gap-2 min-w-0 w-full">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="h-4 w-14 shrink-0 animate-pulse rounded-md bg-slate-100 sm:w-20" />
                  <div className="h-4 flex-1 animate-pulse rounded-md bg-slate-200" />
                </div>
                <div className="h-4 w-20 shrink-0 animate-pulse rounded-md bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
