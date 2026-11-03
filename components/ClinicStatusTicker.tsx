"use client";

import Link from "next/link";
import { clinic, doctors } from "@/data/clinic";
import {
  addDays,
  clinicClock,
  DAY_NAMES,
  formatTime,
  sessionOn,
  toMinutes,
  weekdayOf,
} from "@/lib/schedule";
import { useClinicMinute } from "./useClinicMinute";

export function ClinicStatusTicker({ className = "" }: { className?: string }) {
  const minute = useClinicMinute();

  // Static/SSR fallback prevents layout shift and guarantees SEO readability
  if (minute === null) {
    return (
      <div
        className={`inline-flex max-w-full items-center gap-2 rounded-full border border-brand/20 bg-white/95 px-3 py-1.5 text-xs text-charcoal shadow-xs whitespace-nowrap ${className}`}
      >
        <span className="flex items-center gap-1.5 font-bold text-brand shrink-0">
          <span className="size-2 rounded-full bg-brand animate-pulse" />
          <span>Open Daily</span>
        </span>
        <span className="text-line-strong" aria-hidden="true">
          ·
        </span>
        <span className="tabular-nums lining-nums text-muted shrink-0">
          {formatTime(clinic.hours.open)} – {formatTime(clinic.hours.close)}
        </span>
        <span className="text-line-strong hidden sm:inline" aria-hidden="true">
          ·
        </span>
        <span className="font-medium text-ink hidden sm:inline">
          Diagnostic Lab &amp; Pharmacy Open
        </span>
      </div>
    );
  }

  const now = new Date(minute);
  const { dateKey, weekday, minutes } = clinicClock(now);
  const openMin = toMinutes(clinic.hours.open);
  const closeMin = toMinutes(clinic.hours.close);

  const isOpenNow = minutes >= openMin && minutes < closeMin;
  const isEarly = minutes < openMin;

  const sittingsOn = (date: string) =>
    doctors
      .flatMap((doctor) => {
        const session = sessionOn(doctor, weekdayOf(date), date);
        return session ? [{ doctor, session }] : [];
      })
      .sort((a, b) => a.session.start.localeCompare(b.session.start));

  const todaySittings = sittingsOn(dateKey);

  let opdMessage = "";
  let opdMessageMobile = "";
  let opdTarget = "#today";

  if (todaySittings.length > 0) {
    const count = todaySittings.length;
    opdMessage = `${count} ${count === 1 ? "specialist" : "specialists"} sitting today`;
    opdMessageMobile = `${count} ${count === 1 ? "doctor" : "doctors"} today`;
  } else {
    let ahead = 1;
    let next = sittingsOn(addDays(dateKey, ahead));
    while (next.length === 0 && ahead < 7) {
      next = sittingsOn(addDays(dateKey, ++ahead));
    }
    const nextDay = DAY_NAMES[weekdayOf(addDays(dateKey, ahead))];
    opdMessage = `Next OPD: ${nextDay} (${next.length} ${next.length === 1 ? "doctor" : "doctors"})`;
    opdMessageMobile = `Next OPD: ${nextDay} (${next.length})`;
    opdTarget = "#days";
  }

  return (
    <div
      className={`inline-flex max-w-full items-center gap-2 rounded-full border border-brand/25 bg-white/95 px-3.5 py-1.5 text-xs text-charcoal shadow-xs backdrop-blur-xs transition-all hover:border-brand/50 whitespace-nowrap ${className}`}
    >
      {/* Clinic Open / Closed Status Dot & Text */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span
          className={`size-2 rounded-full ${
            isOpenNow
              ? "bg-[#25D366] shadow-[0_0_8px_rgba(37,211,102,0.6)] animate-pulse"
              : isEarly
                ? "bg-amber-500"
                : "bg-charcoal/40"
          }`}
          aria-hidden="true"
        />
        <strong className="font-bold text-ink">
          {isOpenNow
            ? "Open Now"
            : isEarly
              ? `Opens at ${formatTime(clinic.hours.open)}`
              : "Closed for night"}
        </strong>
      </div>

      <span className="text-line-strong" aria-hidden="true">
        ·
      </span>

      {/* Hours note on large screens */}
      <span className="text-muted tabular-nums lining-nums hidden lg:inline">
        {isOpenNow
          ? `Closes at ${formatTime(clinic.hours.close)}`
          : `Daily: ${formatTime(clinic.hours.open)} – ${formatTime(clinic.hours.close)}`}
      </span>

      <span className="text-line-strong hidden lg:inline" aria-hidden="true">
        ·
      </span>

      {/* OPD Doctor live badge linking to today / days */}
      <a
        href={opdTarget}
        className="font-bold text-brand hover:underline flex items-center gap-1 transition-colors shrink-0"
      >
        <span className="sm:hidden">{opdMessageMobile}</span>
        <span className="hidden sm:inline">{opdMessage}</span>
        <span aria-hidden="true">↓</span>
      </a>
    </div>
  );
}
