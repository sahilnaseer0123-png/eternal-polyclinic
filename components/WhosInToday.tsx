// "Who's in today": worked out fresh for every visitor, in clinic time (Asia/Kolkata).
// `await io()` keeps this out of the prebuilt page, so the day is never frozen at build time.
// Rendered inside <Suspense> in app/page.tsx; WhosInTodaySkeleton is the placeholder.

import { io } from "next/cache";
import { clinic, doctors } from "@/data/clinic";
import {
  addDays,
  clinicClock,
  dateLabel,
  doctorsInToday,
  formatTime,
  isOpenNow,
  nextSpecialist,
  sessionStatus,
} from "@/lib/schedule";
import { DoctorAvatar } from "./DoctorAvatar";

const STATUS_TEXT = {
  upcoming: (start: string) => `Starts at ${formatTime(start)}`,
  in: () => "In the clinic now",
  done: () => "Finished for today",
} as const;

export async function WhosInToday() {
  await io();
  const now = new Date();
  const clock = clinicClock(now);
  const today = doctorsInToday(doctors, now);
  const next = nextSpecialist(doctors, now);
  const open = isOpenNow(clinic.hours, now);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="today" className="text-2xl font-bold sm:text-3xl">
          Who&apos;s in today
        </h2>
        <p className="text-base text-muted">
          {dateLabel(clock.dateKey)} ·{" "}
          <span className={open ? "font-semibold text-brand" : "font-semibold"}>
            {open ? `Open now, until ${formatTime(clinic.hours.close)}` : `Closed now, opens ${formatTime(clinic.hours.open)}`}
          </span>
        </p>
      </div>

      {today.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2">
          {today.map(({ doctor, session }) => {
            const status = sessionStatus(session, now);
            return (
              <li key={doctor.id} className="flex items-center gap-4 rounded-2xl border border-brand-line bg-brand-tint p-4">
                <DoctorAvatar doctor={doctor} size={56} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{doctor.name ?? doctor.speciality}</p>
                  <p className="text-base">
                    {doctor.speciality} · {formatTime(session.start)} – {formatTime(session.end)}
                  </p>
                  <p className={`text-base font-semibold ${status === "in" ? "text-brand" : "text-muted"}`}>
                    {STATUS_TEXT[status](session.start)}
                  </p>
                </div>
                {status !== "done" && (
                  <a
                    href={`#book-${doctor.id}`}
                    className="inline-flex min-h-11 shrink-0 items-center rounded-xl bg-brand px-4 text-base font-semibold text-white hover:bg-brand-dark"
                  >
                    Book
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-ground p-5">
          <div>
            <p className="font-semibold">No visiting specialist today.</p>
            {next && (
              <p className="text-base text-muted">
                Next: {next.doctor.name ?? next.doctor.speciality} ({next.doctor.speciality}),{" "}
                {next.daysAhead === 1 ? "tomorrow" : dateLabel(addDays(clock.dateKey, next.daysAhead))},{" "}
                {formatTime(next.session.start)} – {formatTime(next.session.end)}
              </p>
            )}
          </div>
          {next && (
            <a
              href={`#book-${next.doctor.id}`}
              className="inline-flex min-h-11 items-center rounded-xl bg-brand px-4 text-base font-semibold text-white hover:bg-brand-dark"
            >
              Book {next.doctor.name ?? next.doctor.speciality}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export function WhosInTodaySkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true">
      <h2 className="text-2xl font-bold sm:text-3xl">Who&apos;s in today</h2>
      <div className="h-24 animate-pulse rounded-2xl bg-line/60" />
    </div>
  );
}
