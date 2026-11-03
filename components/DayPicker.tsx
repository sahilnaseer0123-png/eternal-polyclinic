"use client";

// The day-first home section (design v3): seven days, each showing how many specialists sit, then the list of
// who sits on the chosen day. Everything is read from data/clinic.ts. "Today" is worked out in the visitor's
// browser in clinic time (CLAUDE.md rules 2 and 3), so the prebuilt page never freezes a date.
// Before the browser takes over, the page shows the first weekday with its schedule (same height, no jump).

import Link from "next/link";
import { useState } from "react";
import { clinic, doctors, type Doctor, type OpdSession, type Weekday } from "@/data/clinic";
import { clinicClock, DAY_NAMES, formatTime } from "@/lib/schedule";
import { useClinicMinute } from "./useClinicMinute";

const DAY_ORDER: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

type Sitting = { doctor: Doctor; session: OpdSession };

/** Every sitting on a weekday, earliest first. Rotating sittings (1st-of-month, alternate) carry a note. */
function sittingsOn(day: Weekday): Sitting[] {
  return doctors
    .flatMap((doctor) => doctor.opd.filter((s) => s.day === day).map((session) => ({ doctor, session })))
    .sort((a, b) => a.session.start.localeCompare(b.session.start));
}

function noteFor(s: OpdSession): string | null {
  if (s.note) return s.note;
  if (s.recurrence === "first-of-month") return `First ${DAY_NAMES[s.day]} of the month`;
  if (s.recurrence === "alternate") return `Alternate ${DAY_NAMES[s.day]}s`;
  return null;
}

export function DayPicker() {
  const minute = useClinicMinute();
  const [picked, setPicked] = useState<Weekday | null>(null);
  const today: Weekday | null = minute === null ? null : clinicClock(new Date(minute)).weekday;
  // Open on today; if no specialist sits today, open on the next day that has one.
  const firstBusyFrom = (from: Weekday): Weekday =>
    DAY_ORDER.map((_, i) => ((from + i) % 7) as Weekday).find((d) => sittingsOn(d).length > 0) ?? from;
  const selected: Weekday = picked ?? (today === null ? 0 : firstBusyFrom(today));
  const list = sittingsOn(selected);
  const dayName = DAY_NAMES[selected];
  const nextDay = sittingsOn(selected).length === 0 ? firstBusyFrom(((selected + 1) % 7) as Weekday) : undefined;

  return (
    <section id="days" aria-labelledby="days-title" className="bg-ground scroll-mt-20">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-6 sm:py-20">
        <p className="eyebrow text-brand">Visiting specialists</p>
        <h2 id="days-title" className="mt-3 text-[2.125rem] font-light leading-none tracking-[-0.04em] sm:text-6xl">
          Who sits on <em className="text-brand">{dayName}</em>
        </h2>

        <div role="group" aria-label="Choose a day" className="mt-8 grid grid-cols-7 gap-1.5 sm:gap-3">
          {DAY_ORDER.map((day) => {
            const count = sittingsOn(day).length;
            const on = day === selected;
            return (
              <button
                key={day}
                type="button"
                aria-pressed={on}
                onClick={() => setPicked(day)}
                className={`flex min-h-16 flex-col items-center justify-center rounded-xl border px-1 py-2 text-center sm:min-h-24 sm:rounded-2xl ${
                  on
                    ? "border-brand bg-brand text-white"
                    : "border-line-strong bg-white text-ink hover:border-brand"
                }`}
              >
                <span className="text-[0.8125rem] font-bold sm:text-sm">
                  <span className="sm:hidden">{DAY_NAMES[day].slice(0, 3)}</span>
                  <span className="hidden sm:inline">{DAY_NAMES[day]}</span>
                </span>
                <span className="font-display text-xl font-medium leading-tight sm:text-3xl">{count || "–"}</span>
                <span className={`hidden text-xs sm:block ${on ? "text-white/80" : "text-muted"}`}>
                  {count === 0 ? "No OPD" : count === 1 ? "specialist" : "specialists"}
                </span>
                {today === day && (
                  <span className={`text-[0.625rem] sm:text-[0.6875rem] font-bold uppercase tracking-tight sm:tracking-wider ${on ? "text-white" : "text-brand"}`}>
                    Today
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div aria-live="polite" className="mt-6 min-h-40 sm:mt-8">
          {list.length === 0 ? (
            <p className="card rounded-2xl p-6 text-base text-muted sm:text-lg">
              No specialist OPD on {dayName}. Pick another day above, or call{" "}
              <a href={`tel:${clinic.phone}`} className="font-bold text-brand underline">
                {clinic.phoneDisplay}
              </a>{" "}
              to ask about scans and tests.
              {nextDay !== undefined && (
                <button
                  type="button"
                  onClick={() => setPicked(nextDay)}
                  className="mt-4 flex min-h-11 items-center rounded-xl bg-brand px-5 text-base font-bold text-white hover:bg-brand-dark"
                >
                  See {DAY_NAMES[nextDay]}
                </button>
              )}
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {list.map(({ doctor, session }) => {
                const note = noteFor(session);
                return (
                  <li
                    key={`${doctor.id}-${session.day}`}
                    className="card grid gap-3 rounded-2xl p-4 sm:grid-cols-[11rem_1fr_auto] sm:items-center sm:gap-6 sm:p-6"
                  >
                    <p className="font-display text-xl font-medium tracking-tight sm:text-2xl">
                      {formatTime(session.start)}
                      <span className="block text-sm font-normal text-muted">to {formatTime(session.end)}</span>
                    </p>
                    <div className="min-w-0">
                      <h3 className="font-display text-xl font-medium leading-snug tracking-tight sm:text-[1.5625rem]">
                        <Link href={`/doctors/${doctor.id}`} className="hover:text-brand">
                          {doctor.name ?? doctor.speciality}
                        </Link>
                      </h3>
                      <p className="text-base font-semibold text-brand">{doctor.speciality}</p>
                      <p className="text-sm text-muted">{doctor.credentials ?? doctor.degree}</p>
                      {note && (
                        <p className="mt-2 inline-block rounded-full bg-sand px-3 py-1 text-xs font-semibold text-charcoal">
                          {note}
                        </p>
                      )}
                    </div>
                    <Link
                      href={`/book?doctor=${doctor.id}`}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-5 text-base font-bold text-white hover:bg-brand-dark"
                    >
                      Book this doctor
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
