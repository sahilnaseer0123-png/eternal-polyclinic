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
import { DoctorMark } from "./DoctorMark";
import { useClinicMinute } from "./useClinicMinute";

const STATUS_TEXT = {
  upcoming: (start: string) => `Starts at ${formatTime(start)}`,
  in: () => "In the clinic now",
  done: () => "Finished for today",
} as const;

// The card fills in on the visitor's device, and its height depends on the day (taller when a doctor is in).
// min-h is set above the tallest real card (measured 23 Oct 2026: 320px phone 509px, 390px phone 441px, tablet 510px, desktop 510px, 1024px 536px),
// so the placeholder and every real card are the same size and nothing jumps (rem is 18px from 640px up, so
// lg:min-h-[30rem] = 540px). Re-measure if doctors are added.
const shell =
  "flex h-full min-h-[28rem] flex-col gap-5 rounded-3xl bg-ink p-5 text-white max-[359px]:min-h-[32rem] sm:min-h-[28.5rem] sm:p-7 lg:min-h-[30rem]";
const whiteButton =
  "inline-flex min-h-12 items-center justify-center rounded-2xl bg-white px-5 font-bold text-ink hover:bg-slate-100";

export function WhosInToday() {
  const minute = useClinicMinute();
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
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="today" className="text-sm font-bold uppercase tracking-wider text-glow">
          Who&apos;s in today · {DAY_NAMES[clock.weekday]}
        </h2>
        <p className="text-sm text-slate-400">
          {open ? `Open now, until ${formatTime(clinic.hours.close)}` : `Closed now, opens ${formatTime(clinic.hours.open)}`}
        </p>
      </div>

      {today.length > 0 ? (
        <ul className="flex flex-col gap-4">
          {today.map(({ doctor, session }) => {
            const status = sessionStatus(session, now);
            // Late in the sitting every slot may have passed; then the button books their next day instead.
            const slotsLeftToday = timeSlots(doctor, clock.dateKey, now).length > 0;
            return (
              <li key={doctor.id} className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <DoctorMark doctor={doctor} className="size-14 rounded-2xl bg-white/10 text-2xl sm:size-16" />
                  <div className="min-w-0">
                    <p className="text-xl font-bold tracking-tight text-slate-50 sm:text-2xl">{doctor.name ?? doctor.speciality}</p>
                    <p className="text-slate-400">
                      {doctor.speciality} · {formatTime(session.start)} – {formatTime(session.end)}
                      {session.recurrence === "first-of-month" && (
                        <span className="ml-2 inline-block rounded-md bg-white/15 px-2 py-0.5 text-xs font-semibold text-glow">
                          1st of mo
                        </span>
                      )}
                      {session.recurrence === "alternate" && (
                        <span className="ml-2 inline-block rounded-md bg-white/15 px-2 py-0.5 text-xs font-semibold text-glow">
                          Alternate Fridays (Call to confirm)
                        </span>
                      )}
                    </p>
                    <p className={`font-semibold ${status === "in" ? "text-glow" : "text-slate-400"}`}>
                      {STATUS_TEXT[status](session.start)}
                    </p>
                  </div>
                </div>
                <Link href={`/book?doctor=${doctor.id}`} className={whiteButton}>
                  Book {doctor.name ?? doctor.speciality}
                  {slotsLeftToday ? " today" : ", next visit"}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xl font-bold tracking-tight text-slate-50 sm:text-2xl">No visiting specialist today</p>
            {next && (
              // Split into short lines (who, then when) instead of one crowded sentence.
              <p className="mt-3 flex flex-col gap-0.5">
                <span className="text-sm text-slate-400">Next visit</span>
                <span className="font-semibold text-slate-100">
                  {next.doctor.name ?? next.doctor.speciality}
                  {next.doctor.name && <span className="font-normal text-slate-400">, {next.doctor.speciality}</span>}
                </span>
                <span className="text-slate-400">
                  {next.daysAhead === 1 ? "Tomorrow" : DAY_NAMES[weekdayOf(addDays(clock.dateKey, next.daysAhead))]} ·{" "}
                  <span className="whitespace-nowrap">
                    {formatTimeShort(next.session.start)}–{formatTimeShort(next.session.end)}
                  </span>
                </span>
              </p>
            )}
          </div>
          {next && (
            <Link href={`/book?doctor=${next.doctor.id}`} className={whiteButton}>
              Book {next.doctor.name ?? next.doctor.speciality}
            </Link>
          )}
        </div>
      )}

      {week.length > 0 && (
        <div className="mt-auto border-t border-slate-700 pt-4">
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="text-sm font-semibold text-slate-400">This week</h3>
            <Link href="/doctors#schedule" className="inline-flex min-h-11 items-center text-sm font-semibold text-white underline">
              Full schedule
            </Link>
          </div>
          <ul className="flex flex-col gap-1.5 text-base">
            {week.map(({ key, label, doctor, s, isToday }) => (
              <li key={key} className={`flex items-baseline gap-2 sm:gap-3 ${isToday ? "font-semibold" : ""}`}>
                <span className="w-16 shrink-0 font-semibold text-glow">{label}</span>
                <span className="min-w-0 flex-1 truncate text-slate-200">
                  {doctor.name ?? doctor.speciality}
                  {s.recurrence === "first-of-month" && (
                    <span className="ml-1.5 text-xs font-normal text-glow">
                      (1st of mo)
                    </span>
                  )}
                  {s.recurrence === "alternate" && (
                    <span className="ml-1.5 text-xs font-normal text-glow">
                      (Alt week)
                    </span>
                  )}
                </span>
                <span className="whitespace-nowrap text-sm text-slate-400">
                  {formatTimeShort(s.start)}–{formatTimeShort(s.end)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function WhosInTodaySkeleton() {
  return (
    <div className={shell} aria-busy="true">
      <h2 className="text-sm font-bold uppercase tracking-wider text-glow">Who&apos;s in today</h2>
      <div className="h-24 animate-pulse rounded-2xl bg-white/10" />
      <div className="mt-auto h-28 animate-pulse rounded-2xl bg-white/10" />
    </div>
  );
}
