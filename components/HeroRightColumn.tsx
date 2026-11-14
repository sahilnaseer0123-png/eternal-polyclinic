"use client";
/* eslint-disable @next/next/no-img-element */

// Right-column compact cards for the Healist-inspired home hero:
// 1. "Book an appointment" twin-panel split card (action card + studio stethoscope visual)
// 2. "In the clinic today" live OPD & digital WhatsApp lab reports block (computed in clinic IST time)

import Link from "next/link";
import { clinic } from "@/data/clinic";
import { isDoctorOnLeave, useActiveDoctors, useDoctorStatuses } from "@/lib/appointments";
import { addDays, clinicClock, DAY_NAMES, formatTime, formatTimeShort, sessionOn, weekdayOf } from "@/lib/schedule";
import { useClinicMinute } from "./useClinicMinute";

function ArrowUpRight({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M4.5 11.5L11.5 4.5" />
      <path d="M5.75 4.5H11.5V10.25" />
    </svg>
  );
}

function SparkleCross({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M8 1.75L9.4 6.6L14.25 8L9.4 9.4L8 14.25L6.6 9.4L1.75 8L6.6 6.6L8 1.75Z" />
    </svg>
  );
}

export function HeroRightColumn() {
  const minute = useClinicMinute();
  const activeDoctors = useActiveDoctors();
  const statuses = useDoctorStatuses();

  let statusHeading = "IN THE CLINIC TODAY";
  let statusCopy = `Visiting specialists, ultrasound scans, diagnostic lab & pharmacy open daily (${formatTime(clinic.hours.open)} – ${formatTime(clinic.hours.close)}).`;
  let openBadge = "Open daily";

  if (minute !== null) {
    const now = new Date(minute);
    const { dateKey, weekday, minutes } = clinicClock(now);
    const [openH, openM] = clinic.hours.open.split(":").map(Number);
    const [closeH, closeM] = clinic.hours.close.split(":").map(Number);
    const isOpenNow = minutes >= openH * 60 + openM && minutes < closeH * 60 + closeM;
    openBadge = isOpenNow ? "Open now" : `Opens ${formatTimeShort(clinic.hours.open)}`;

    const sittingsOn = (date: string, isTodayDate = false) =>
      activeDoctors
        .filter((doctor) => !isDoctorOnLeave(doctor))
        .filter((doctor) => !(isTodayDate && statuses[doctor.id]?.state === "cancelled"))
        .flatMap((doctor) => {
          const session = sessionOn(doctor, weekdayOf(date), date);
          return session ? [{ doctor, session }] : [];
        })
        .sort((a, b) => a.session.start.localeCompare(b.session.start));

    const today = sittingsOn(dateKey, true);
    statusHeading = `TODAY · ${DAY_NAMES[weekday].toUpperCase()}`;

    if (today.length > 0) {
      const names = today
        .slice(0, 2)
        .map(({ doctor, session }) => {
          const base = doctor.name ?? doctor.speciality;
          const live = statuses[doctor.id];
          if (live?.state === "delayed") return `${base} — delayed ~${live.delayMinutes ?? 30}m`;
          if (live?.state === "in_clinic") return `${base} — in clinic`;
          if (session.recurrence === "alternate") return `${base} (alt. Fri)`;
          return base;
        })
        .join(", ");
      const extra = today.length > 2 ? ` +${today.length - 2} more` : "";
      statusCopy = `${today.length} ${today.length === 1 ? "specialist" : "specialists"} consulting today (${names}${extra}). Lab & scan PDFs sent on WhatsApp.`;
    } else {
      let ahead = 1;
      let next = sittingsOn(addDays(dateKey, ahead));
      while (next.length === 0 && ahead < 7) next = sittingsOn(addDays(dateKey, ++ahead));
      const nextName = DAY_NAMES[weekdayOf(addDays(dateKey, ahead))];
      statusCopy =
        next.length > 0
          ? `Lab, scans & pharmacy open today. Next specialist OPD on ${nextName} (${next.length} ${next.length === 1 ? "doctor" : "doctors"}).`
          : `Diagnostic lab, ultrasound scans & pharmacy open daily (${formatTime(clinic.hours.open)} – ${formatTime(clinic.hours.close)}).`;
    }
  }

  return (
    <div id="today" className="rise rise-3 w-full">
      {/* Tablet & Desktop (>= 640px): Two-block right column */}
      <div className="hidden sm:grid sm:grid-cols-2 sm:gap-5 min-[72rem]:grid-cols-1 min-[72rem]:gap-6 w-full">
        {/* 1. Split Appointment Card */}
        <Link
          href="/book"
          className="group flex items-stretch gap-2.5 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
        >
          <div className="flex min-h-[126px] flex-1 flex-col justify-between rounded-2xl border border-line bg-ground p-4 transition-colors group-hover:border-brand-line group-hover:bg-brand-tint/50">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted">
                <span className="size-1.5 rounded-full bg-[#22A05B]" aria-hidden="true" />
                {openBadge}
              </span>
              <span className="btn-arrow inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-tint text-accent ring-1 ring-brand-line transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                <ArrowUpRight className="size-3.5" />
              </span>
            </div>
            <span className="block font-sans text-[0.95rem] font-semibold leading-[1.22] tracking-[-0.015em] text-ink">
              Book an
              <br />
              appointment
            </span>
          </div>

          <div className="relative w-[112px] sm:w-[118px] shrink-0 overflow-hidden rounded-2xl border border-line bg-sand">
            <img
              src="/photos/stethoscope-card.webp"
              alt="Clinical care at Eternal Polyclinic"
              width={180}
              height={180}
              loading="eager"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        </Link>

        {/* 2. Compact Today's OPD & Digital Lab Reports Info Block */}
        <div className="flex flex-col justify-between rounded-2xl border border-line bg-ground/60 p-4 min-[72rem]:border-0 min-[72rem]:bg-transparent min-[72rem]:p-0">
          <div>
            <p className="flex items-center gap-1.5 font-sans text-xs font-bold uppercase tracking-[0.11em] text-ink">
              <SparkleCross className="size-3.5 text-accent shrink-0" />
              <span>{statusHeading}</span>
            </p>
            <p className="mt-2 text-[0.85rem] leading-[1.55] text-muted">
              {statusCopy}
            </p>
          </div>

          <div className="mt-3.5 flex flex-wrap items-center gap-4">
            <a
              href="#days"
              className="group inline-flex items-center gap-2 text-[0.85rem] font-semibold text-ink hover:text-accent transition-colors"
            >
              <span className="underline decoration-line-strong underline-offset-4 group-hover:decoration-brand-dark">
                See schedule
              </span>
              <span className="btn-arrow inline-flex size-6 items-center justify-center rounded-md bg-brand-tint text-accent ring-1 ring-brand-line transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                <ArrowUpRight className="size-3" />
              </span>
            </a>

            <a
              href={clinic.reportRequestUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-accent transition-colors"
            >
              <span>Lab reports ({clinic.labTechPhoneDisplay})</span>
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
