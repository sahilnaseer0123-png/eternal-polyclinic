// "Who's in today" (design C dark card): worked out fresh for every visitor, in clinic time (Asia/Kolkata).
// `await io()` keeps this out of the prebuilt page, so the day is never frozen at build time.
// Rendered inside <Suspense> in app/page.tsx; WhosInTodaySkeleton is the placeholder.

import Link from "next/link";
import { io } from "next/cache";
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

const STATUS_TEXT = {
  upcoming: (start: string) => `Starts at ${formatTime(start)}`,
  in: () => "In the clinic now",
  done: () => "Finished for today",
} as const;

// min-h matches the usual card height, so the placeholder and the real card are the same size
// and nothing below jumps when it streams in.
const shell = "flex h-full min-h-[25rem] flex-col gap-5 rounded-3xl bg-ink p-5 text-white sm:p-7";
const whiteButton =
  "inline-flex min-h-12 items-center justify-center rounded-2xl bg-white px-5 font-bold text-ink hover:bg-slate-100";

export async function WhosInToday() {
  await io();
  const now = new Date();
  const clock = clinicClock(now);
  const today = doctorsInToday(doctors, now);
  const next = nextSpecialist(doctors, now);
  const open = isOpenNow(clinic.hours, now);

  // The next 7 days that have a specialist, starting today.
  const week = Array.from({ length: 7 }, (_, i) => addDays(clock.dateKey, i)).flatMap((dateKey, i) => {
    const day = weekdayOf(dateKey);
    return doctors.flatMap((doctor) => {
      const s = sessionOn(doctor, day);
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
        <p className="text-sm text-slate-300">
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
                    <p className="text-xl font-extrabold sm:text-2xl">{doctor.name ?? doctor.speciality}</p>
                    <p className="text-slate-300">
                      {doctor.speciality} · {formatTime(session.start)} – {formatTime(session.end)}
                    </p>
                    <p className={`font-semibold ${status === "in" ? "text-glow" : "text-slate-300"}`}>
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
            <p className="text-xl font-extrabold sm:text-2xl">No visiting specialist today</p>
            {next && (
              <p className="text-slate-300">
                Next: {next.doctor.name ?? next.doctor.speciality} ({next.doctor.speciality}),{" "}
                {next.daysAhead === 1 ? "tomorrow" : DAY_NAMES[weekdayOf(addDays(clock.dateKey, next.daysAhead))]},{" "}
                {formatTime(next.session.start)} – {formatTime(next.session.end)}
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
            <h3 className="text-sm font-semibold text-slate-300">This week</h3>
            <Link href="/doctors#schedule" className="inline-flex min-h-11 items-center text-sm font-semibold text-white underline">
              Full schedule
            </Link>
          </div>
          <ul className="flex flex-col gap-1.5 text-base">
            {week.map(({ key, label, doctor, s, isToday }) => (
              <li key={key} className={`flex gap-3 ${isToday ? "font-bold" : ""}`}>
                <span className="w-20 shrink-0 font-semibold text-glow">{label}</span>
                <span className="min-w-0 flex-1">{doctor.name ?? doctor.speciality}</span>
                <span className="whitespace-nowrap text-slate-300">
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
