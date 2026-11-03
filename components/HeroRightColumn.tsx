"use client";

// Right-column compact cards for the Healist-inspired home hero:
// 1. "Book an appointment" twin-panel split card (action card + studio stethoscope visual)
// 2. "In the clinic today" live OPD & digital WhatsApp lab reports block (computed in clinic IST time)

import Link from "next/link";
import { clinic, doctors } from "@/data/clinic";
import { addDays, clinicClock, DAY_NAMES, formatTime, sessionOn, weekdayOf } from "@/lib/schedule";
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

  let statusHeading = "IN THE CLINIC TODAY";
  let statusHeadingCompact = "TODAY'S CLINIC";
  let statusCopy = `Visiting specialists, ultrasound scans, diagnostic lab & pharmacy open daily (${formatTime(clinic.hours.open)} – ${formatTime(clinic.hours.close)}).`;
  let openBadge = "Open daily";

  if (minute !== null) {
    const now = new Date(minute);
    const { dateKey, weekday, minutes } = clinicClock(now);
    const [openH, openM] = clinic.hours.open.split(":").map(Number);
    const [closeH, closeM] = clinic.hours.close.split(":").map(Number);
    const isOpenNow = minutes >= openH * 60 + openM && minutes < closeH * 60 + closeM;
    openBadge = isOpenNow ? "Open now" : `Opens ${formatTime(clinic.hours.open)}`;

    const sittingsOn = (date: string) =>
      doctors
        .flatMap((doctor) => {
          const session = sessionOn(doctor, weekdayOf(date), date);
          return session ? [{ doctor, session }] : [];
        })
        .sort((a, b) => a.session.start.localeCompare(b.session.start));

    const today = sittingsOn(dateKey);
    statusHeading = `TODAY · ${DAY_NAMES[weekday].toUpperCase()}`;
    statusHeadingCompact = `TODAY · ${DAY_NAMES[weekday].slice(0, 3).toUpperCase()}`;

    if (today.length > 0) {
      const names = today
        .slice(0, 2)
        .map(({ doctor }) => doctor.name ?? doctor.speciality)
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
    <div id="today" className="w-full">
      {/* Mobile (< 640px): Curated single-screen twin-panel live clinic + studio stethoscope card */}
      <div className="sm:hidden">
        <div className="flex items-stretch gap-2.5">
          <div className="flex min-w-0 flex-1 flex-col justify-between rounded-2xl border border-[#E7ECE8] bg-[#F5F7F5] p-3.5">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 font-sans text-[10.5px] font-bold uppercase tracking-[0.09em] text-[#171D1B] whitespace-nowrap">
                <SparkleCross className="size-3 text-brand shrink-0" />
                <span className="min-[410px]:hidden">{statusHeadingCompact}</span>
                <span className="hidden min-[410px]:inline">{statusHeading}</span>
              </p>
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[#3B4B45] ring-1 ring-[#E2EAE4] shrink-0">
                <span className="size-1.5 rounded-full bg-[#22A05B]" aria-hidden="true" />
                {openBadge}
              </span>
            </div>
            <p className="mt-2 text-[12.5px] leading-[1.45] text-[#4E5C57]">
              {statusCopy}
            </p>
          </div>

          <Link
            href="/book"
            aria-label="Book an appointment"
            className="group relative w-[92px] min-[400px]:w-[104px] shrink-0 overflow-hidden rounded-2xl border border-[#E7ECE8] bg-[#E8EFECE6]"
          >
            <img
              src="/photos/stethoscope-card.webp"
              alt=""
              aria-hidden="true"
              width={180}
              height={180}
              loading="eager"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <span className="absolute right-2 top-2 inline-flex size-6 items-center justify-center rounded-lg bg-[#DFF5CA]/95 text-[#15221B] shadow-2xs ring-1 ring-[#CBE8B0]/80">
              <ArrowUpRight className="size-3" />
            </span>
          </Link>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 px-0.5">
          <a
            href="#days"
            className="group inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#171D1B] hover:text-brand transition-colors shrink-0"
          >
            <span className="underline decoration-[#CBD5D0] underline-offset-4 group-hover:decoration-brand">
              See schedule
            </span>
            <span className="inline-flex size-5.5 items-center justify-center rounded-md bg-[#DFF5CA] text-[#15221B]">
              <ArrowUpRight className="size-3" />
            </span>
          </a>

          <a
            href={clinic.reportRequestUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#52605B] hover:text-brand transition-colors tabular-nums lining-nums shrink-0"
          >
            <span>Lab reports ({clinic.labTechPhoneDisplay})</span>
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>

      {/* Tablet & Desktop (>= 640px): Two-block Healist right column */}
      <div className="hidden sm:grid sm:grid-cols-2 sm:gap-5 min-[72rem]:grid-cols-1 min-[72rem]:gap-6 w-full">
        {/* 1. Split Appointment Card (matches Healist's right-side appointment card) */}
        <Link
          href="/book"
          className="group flex items-stretch gap-2.5 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
        >
          <div className="flex min-h-[126px] flex-1 flex-col justify-between rounded-2xl border border-[#E7ECE8] bg-[#F5F7F5] p-4 transition-colors group-hover:border-[#D2DFD6] group-hover:bg-[#EEF3EE]">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#4A5954]">
                <span className="size-1.5 rounded-full bg-[#22A05B]" aria-hidden="true" />
                {openBadge}
              </span>
              <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#DFF5CA] text-[#15221B] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                <ArrowUpRight className="size-3.5" />
              </span>
            </div>
            <span className="block font-sans text-[0.95rem] font-semibold leading-[1.22] tracking-[-0.015em] text-[#171D1B]">
              Book an
              <br />
              appointment
            </span>
          </div>

          <div className="relative w-[112px] sm:w-[118px] shrink-0 overflow-hidden rounded-2xl border border-[#E7ECE8] bg-[#E8EFECE6]">
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
        <div className="flex flex-col justify-between rounded-2xl border border-[#ECEFEA] bg-[#FAFBFA] p-4 min-[72rem]:border-0 min-[72rem]:bg-transparent min-[72rem]:p-0">
          <div>
            <p className="flex items-center gap-1.5 font-sans text-xs font-bold uppercase tracking-[0.11em] text-[#171D1B]">
              <SparkleCross className="size-3.5 text-brand shrink-0" />
              <span>{statusHeading}</span>
            </p>
            <p className="mt-2 text-[0.85rem] leading-[1.55] text-[#55635E]">
              {statusCopy}
            </p>
          </div>

          <div className="mt-3.5 flex flex-wrap items-center gap-4">
            <a
              href="#days"
              className="group inline-flex items-center gap-2 text-[0.85rem] font-semibold text-[#171D1B] hover:text-brand transition-colors"
            >
              <span className="underline decoration-[#CBD5D0] underline-offset-4 group-hover:decoration-brand">
                See schedule
              </span>
              <span className="inline-flex size-6 items-center justify-center rounded-md bg-[#DFF5CA] text-[#15221B] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                <ArrowUpRight className="size-3" />
              </span>
            </a>

            <a
              href={clinic.reportRequestUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#55635E] hover:text-brand transition-colors"
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
