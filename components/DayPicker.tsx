"use client";

// The day-first home section (design v3): seven days, each showing how many specialists sit, then the list of
// who sits on the chosen day. Everything is read from data/clinic.ts. "Today" is worked out in the visitor's
// browser in clinic time (CLAUDE.md rules 2 and 3), so the prebuilt page never freezes a date.
// Before the browser takes over, the page shows the first weekday with its schedule (same height, no jump).

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { clinic, type Doctor, type OpdSession, type Weekday } from "@/data/clinic";
import { isBuiltInDoctor, isDoctorOnLeave, useActiveDoctors, useDoctorStatuses } from "@/lib/appointments";
import { addDays, clinicClock, DAY_NAMES, formatTime, sessionOn } from "@/lib/schedule";
import { useClinicMinute } from "./useClinicMinute";

const DAY_ORDER: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

type Sitting = { doctor: Doctor; session: OpdSession };

function noteFor(s: OpdSession): string | null {
  if (s.note) return s.note;
  if (s.recurrence === "first-of-month") return `First ${DAY_NAMES[s.day]} of the month`;
  if (s.recurrence === "alternate") return `Alternate ${DAY_NAMES[s.day]}s`;
  return null;
}

export function DayPicker() {
  const minute = useClinicMinute();
  const activeDoctors = useActiveDoctors();
  const statuses = useDoctorStatuses();
  const [picked, setPicked] = useState<Weekday | null>(null);
  const clock = minute === null ? null : clinicClock(new Date(minute));
  const today: Weekday | null = clock ? clock.weekday : null;

  const dateFor = (day: Weekday): string | undefined =>
    clock ? addDays(clock.dateKey, (day - clock.weekday + 7) % 7) : undefined;

  const sittingsOn = (day: Weekday): Sitting[] => {
    const targetDate = dateFor(day);
    const isTodayDay = today !== null && day === today;
    return activeDoctors
      .filter((doctor) => !isDoctorOnLeave(doctor))
      .filter((doctor) => !(isTodayDay && statuses[doctor.id]?.state === "cancelled"))
      .flatMap((doctor) => {
        const session = sessionOn(doctor, day, targetDate);
        return session ? [{ doctor, session }] : [];
      })
      .sort((a, b) => a.session.start.localeCompare(b.session.start));
  };

  // Open on today; if no specialist sits today, open on the next day that has one.
  const firstBusyFrom = (from: Weekday): Weekday =>
    DAY_ORDER.map((_, i) => ((from + i) % 7) as Weekday).find((d) => sittingsOn(d).length > 0) ?? from;
  const selected: Weekday = picked ?? (today === null ? 0 : firstBusyFrom(today));
  const list = sittingsOn(selected);
  const dayName = DAY_NAMES[selected];
  const nextDay = list.length === 0 ? firstBusyFrom(((selected + 1) % 7) as Weekday) : undefined;

  // Specialists who normally sit on this weekday once a month, when this upcoming weekday isn't their week
  const monthlyNotThisWeek = clock
    ? activeDoctors.filter((doctor) => {
        if (isDoctorOnLeave(doctor)) return false;
        const raw = doctor.opd.find((s) => s.day === selected && s.recurrence === "first-of-month");
        if (!raw) return false;
        return !sessionOn(doctor, selected, dateFor(selected));
      })
    : [];

  return (
    <div className="bg-white">
      <section id="days" aria-labelledby="days-title" className="rounded-t-[2rem] sm:rounded-t-[2.75rem] border-t border-line/80 bg-ground scroll-mt-20">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6 sm:py-20">
        <div className="reveal">
          <p className="eyebrow text-muted">Visiting specialists</p>
          <h2 id="days-title" className="mt-3 text-[2rem] font-semibold leading-[1.08] tracking-[-0.035em] text-ink sm:text-5xl">
            Who sits on{" "}
            <em key={selected} className="ep-mark inline-block rounded-xl px-2.5 py-0.5 ring-1 ring-brand-line/70">
              {dayName}
            </em>
          </h2>
        </div>

        <div role="group" aria-label="Choose a day" className="mt-5 sm:mt-8 grid grid-cols-7 gap-1 min-[390px]:gap-1.5 sm:gap-3">
          {DAY_ORDER.map((day) => {
            const count = sittingsOn(day).length;
            const on = day === selected;
            return (
              <button
                key={day}
                type="button"
                aria-pressed={on}
                onClick={() => setPicked(day)}
                className={`flex min-h-16 flex-col items-center justify-center rounded-xl border px-0.5 min-[390px]:px-1 py-2 text-center transition-all duration-200 sm:min-h-24 sm:rounded-2xl ${
                  on
                    ? "border-brand bg-brand text-white shadow-elevated"
                    : "border-line-strong bg-white text-ink hover:border-brand"
                }`}
              >
                <span className="text-[0.8125rem] font-bold sm:text-sm">
                  <span className="sm:hidden">{DAY_NAMES[day].slice(0, 3)}</span>
                  <span className="hidden sm:inline">{DAY_NAMES[day]}</span>
                </span>
                <span className="font-display text-xl font-semibold leading-tight sm:text-3xl tabular-nums lining-nums">{count || "–"}</span>
                <span className={`hidden text-[15px] sm:block ${on ? "text-white/75" : "text-muted"}`}>
                  {count === 0 ? "No OPD" : count === 1 ? "specialist" : "specialists"}
                </span>
                {today === day && (
                  <span className={`text-[9px] min-[390px]:text-[10px] sm:text-[11px] leading-none font-bold uppercase tracking-tight sm:tracking-wider ${on ? "text-mint" : "text-ink"}`}>
                    Today
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div aria-live="polite" className="reveal mt-5 min-h-36 sm:min-h-40 sm:mt-8">
          {list.length === 0 ? (
            <p key={selected} className="card ep-day-swap rounded-2xl p-5 sm:p-6 text-base text-muted sm:text-lg">
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
            <ul key={selected} className="flex flex-col gap-2.5 sm:gap-3">
              {list.map(({ doctor, session }, idx) => {
                const note = noteFor(session);
                const live = today === selected ? statuses[doctor.id] : undefined;
                const profileHref = isBuiltInDoctor(doctor.id) ? `/doctors/${doctor.id}` : `/book?doctor=${doctor.id}`;
                return (
                  <li
                    key={`${doctor.id}-${session.day}`}
                    style={{ "--mo-i": Math.min(idx, 6) } as CSSProperties}
                    className="card ep-stagger-item grid gap-2 rounded-2xl p-3.5 sm:grid-cols-[11rem_1fr_auto] sm:items-center sm:gap-6 sm:p-6"
                  >
                    <p className="hidden sm:block font-display text-xl font-medium tracking-tight sm:text-2xl tabular-nums lining-nums">
                      {formatTime(session.start)}
                      <span className="block text-[15px] font-normal text-muted tabular-nums lining-nums">to {formatTime(session.end)}</span>
                    </p>
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-1.5 sm:mb-0">
                        <span className="sm:hidden inline-flex items-center rounded-md border border-line bg-ground px-2 py-0.5 text-xs font-bold text-ink tabular-nums lining-nums">
                          {formatTime(session.start)} – {formatTime(session.end)}
                        </span>
                        {live?.state === "in_clinic" && (
                          <span className="sm:hidden inline-flex items-center gap-1 rounded-full bg-brand-tint border border-brand-line px-2 py-0.5 text-[11px] font-bold text-ink">
                            <span className="size-1.5 rounded-full bg-[#22A05B]" aria-hidden="true" />
                            In Clinic Now
                          </span>
                        )}
                        {live?.state === "delayed" && (
                          <span className="sm:hidden inline-block rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                            Delayed ~{live.delayMinutes ?? 30}m
                          </span>
                        )}
                      </div>
                      <h3 className="font-display text-lg sm:text-[1.5625rem] font-medium leading-snug tracking-tight">
                        <Link href={profileHref} className="hover:text-brand">
                          {doctor.name ?? doctor.speciality}
                        </Link>
                      </h3>
                      <p className="text-sm sm:text-base font-semibold text-accent">{doctor.speciality}</p>
                      <p className="line-clamp-1 sm:line-clamp-none text-xs sm:text-[15px] text-muted">{doctor.credentials ?? doctor.degree}</p>
                      {(note || live?.state === "in_clinic" || live?.state === "delayed") && (
                        <div className="mt-1.5 sm:mt-2 flex flex-wrap gap-2">
                          {note && (
                            <span className="inline-block rounded-full bg-sand px-2.5 sm:px-3 py-0.5 sm:py-1 text-[11px] sm:text-xs font-semibold text-charcoal">
                              {note}
                            </span>
                          )}
                          {live?.state === "in_clinic" && (
                            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-brand-tint border border-brand-line px-3 py-1 text-xs font-bold text-ink">
                              <span className="size-1.5 rounded-full bg-[#22A05B]" aria-hidden="true" />
                              In Clinic Now
                            </span>
                          )}
                          {live?.state === "delayed" && (
                            <span className="hidden sm:inline-block rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-800">
                              Delayed ~{live.delayMinutes ?? 30}m
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-line/60 sm:border-0 sm:pt-0">
                      <Link
                        href={profileHref}
                        className="sm:hidden inline-flex min-h-11 items-center text-xs font-semibold text-muted hover:text-ink"
                      >
                        View profile →
                      </Link>
                      <Link
                        href={`/book?doctor=${doctor.id}`}
                        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-4 sm:px-5 text-sm sm:text-base font-bold text-white hover:bg-brand-dark shrink-0"
                      >
                        Book this doctor
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {monthlyNotThisWeek.length > 0 && (
            <p className="mt-4 text-sm text-muted">
              Note:{" "}
              {monthlyNotThisWeek.map((d, idx) => (
                <span key={d.id}>
                  {idx > 0 ? ", " : ""}
                  <strong className="font-semibold text-ink">{d.name ?? d.speciality}</strong> ({d.speciality}) sits on
                  the 1st {dayName} of every month
                </span>
              ))}
              .
            </p>
          )}
        </div>
      </div>
      </section>
    </div>
  );
}
