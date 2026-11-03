"use client";

// "In the clinic today" card in the home hero. Worked out in the visitor's browser in clinic time (rules 2 and 3);
// the prebuilt page shows a same-size empty card, so nothing jumps. When nobody sits today it points to the next
// day that has specialists. Rotating sittings (1st-of-month, alternate) are included by sessionOn().

import Link from "next/link";
import { clinic, doctors } from "@/data/clinic";
import { addDays, clinicClock, DAY_NAMES, formatTime, sessionOn, sessionStatus, weekdayOf } from "@/lib/schedule";
import { useClinicMinute } from "./useClinicMinute";

const MAX_ROWS = 4;
const shell = "card rounded-3xl p-5 sm:p-7 min-h-[18rem] scroll-mt-24 w-full min-w-0 max-w-full";

export function TodayCardSkeleton() {
  return (
    <div className={shell} aria-busy="true" aria-label="Loading clinic schedule">
      <div className="h-3 w-40 animate-pulse rounded bg-stone" />
      <div className="mt-4 divide-y divide-line">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-4 py-3.5">
            <div className="w-24 shrink-0 space-y-1.5 pt-0.5">
              <div className="h-4 w-16 animate-pulse rounded bg-stone" />
              <div className="h-3 w-12 animate-pulse rounded bg-stone" />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="h-5 w-40 animate-pulse rounded bg-stone" />
              <div className="h-3.5 w-24 animate-pulse rounded bg-stone" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TodayCard() {
  const minute = useClinicMinute();
  if (minute === null) return <TodayCardSkeleton />;

  const now = new Date(minute);
  const { dateKey, weekday } = clinicClock(now);
  const sittingsOn = (date: string) =>
    doctors
      .flatMap((doctor) => {
        const session = sessionOn(doctor, weekdayOf(date), date);
        return session ? [{ doctor, session }] : [];
      })
      .sort((a, b) => a.session.start.localeCompare(b.session.start));

  const today = sittingsOn(dateKey);

  if (today.length === 0) {
    let ahead = 1;
    let next = sittingsOn(addDays(dateKey, ahead));
    while (next.length === 0 && ahead < 7) next = sittingsOn(addDays(dateKey, ++ahead));
    const nextName = DAY_NAMES[weekdayOf(addDays(dateKey, ahead))];
    return (
      <div id="today" className={shell}>
        <p className="eyebrow text-muted">In the clinic today · {DAY_NAMES[weekday]}</p>
        <p className="mt-4 font-display text-3xl font-medium leading-tight tracking-tight">
          No specialist OPD today
        </p>
        <p className="mt-2 text-base text-muted">
          Scans, tests and the pharmacy are still open. Call{" "}
          <a href={`tel:${clinic.phone}`} className="whitespace-nowrap font-bold text-brand underline">
            {clinic.phoneDisplay}
          </a>{" "}
          to ask.
        </p>
        {next.length > 0 && (
          <a
            href="#days"
            className="mt-6 flex flex-wrap gap-2 sm:gap-0 min-h-14 items-center justify-between rounded-2xl bg-brand-tint px-4 sm:px-5 py-3 font-semibold hover:bg-brand-line"
          >
            <span>
              Next: <span className="font-display text-xl font-medium">{nextName}</span>
            </span>
            <span className="text-brand">
              {next.length} {next.length === 1 ? "specialist" : "specialists"} →
            </span>
          </a>
        )}
      </div>
    );
  }

  const shown = today.slice(0, MAX_ROWS);
  return (
    <div id="today" className={shell}>
      <p className="eyebrow text-muted">In the clinic today · {DAY_NAMES[weekday]}</p>
      <ul className="mt-3 divide-y divide-line">
        {shown.map(({ doctor, session }) => {
          const status = sessionStatus(session, now);
          return (
            <li key={doctor.id}>
              <Link href={`/doctors/${doctor.id}`} className="flex items-start gap-4 py-3.5 hover:text-brand">
                <span className="w-24 shrink-0 pt-0.5 text-[15px] font-bold text-charcoal tabular-nums lining-nums">
                  {formatTime(session.start)}
                  <span className="block text-[15px] font-medium text-muted tabular-nums lining-nums">to {formatTime(session.end)}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-lg font-medium leading-snug tracking-tight">
                    {doctor.name ?? doctor.speciality}
                  </span>
                  <span className="block text-[15px] text-muted">{doctor.speciality}</span>
                </span>
                {status !== "upcoming" && (
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                      status === "in" ? "bg-brand text-white" : "bg-sand text-muted"
                    }`}
                  >
                    {status === "in" ? "In now" : "Finished"}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      {today.length > MAX_ROWS && (
        <a href="#days" className="mt-2 inline-flex min-h-11 items-center text-base font-bold text-brand underline">
          See all {today.length} specialists
        </a>
      )}
    </div>
  );
}
