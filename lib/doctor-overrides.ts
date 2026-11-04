// One rule for turning a built-in doctor plus the admin's changes into what the public sees.
// Used by the browser (lib/appointments.ts) and by Cloudflare Functions (functions/_lib/clinic-store.ts),
// so the Specialists section, doctor pages, booking form and server-side booking checks always agree.
// Pure: no React, no browser APIs, so the server bundle can import it.

import type { Doctor, OpdSession } from "@/data/clinic";

/** The parts of a booked appointment the schedule check needs. */
export type BookedVisit = { doctorId: string; date: string; time: string; status: string };

export type DoctorOverride = {
  onLeave?: boolean;
  deactivated?: boolean;
  /** First day of leave, YYYY-MM-DD in clinic time. Missing = leave starts now. */
  leaveFrom?: string | null;
  /** Last day of leave, YYYY-MM-DD in clinic time. Missing = until staff end it. */
  leaveUntil?: string | null;
  customOpd?: OpdSession[] | null;
  customFee?: string;
  notes?: string;
  /** When the admin last changed this doctor (ms). */
  updatedAt?: number;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** True when the doctor's leave covers `todayKey` (YYYY-MM-DD, clinic time). Leave ends by itself after leaveUntil. */
export function isLeaveActive(ov: DoctorOverride | undefined, todayKey: string): boolean {
  if (!ov?.onLeave) return false;
  if (ov.leaveFrom && DATE_RE.test(ov.leaveFrom) && todayKey < ov.leaveFrom) return false;
  if (ov.leaveUntil && DATE_RE.test(ov.leaveUntil) && todayKey > ov.leaveUntil) return false;
  return true;
}

function shortDate(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** Text shown on cards when leave is active, e.g. "On Leave until 12 Nov". Starts with "On Leave" (see isDoctorOnLeave). */
export function leaveLabel(ov: DoctorOverride): string {
  return `On Leave${ov.leaveUntil && DATE_RE.test(ov.leaveUntil) ? ` until ${shortDate(ov.leaveUntil)}` : ""}`;
}

/** Applies one admin override to one doctor for the given clinic day. Never touches appointments. */
export function applyDoctorOverride(doc: Doctor, ov: DoctorOverride | undefined, todayKey: string): Doctor {
  if (!ov) return doc;
  const opd = Array.isArray(ov.customOpd) ? ov.customOpd : doc.opd;
  if (isLeaveActive(ov, todayKey)) {
    return { ...doc, opd, availability: leaveLabel(ov) };
  }
  // A leave that has ended (or not started) must not leave a stale "On Leave" label behind.
  const availability = doc.availability?.toLowerCase().startsWith("on leave") ? undefined : doc.availability;
  return { ...doc, opd, availability };
}

/** Built-in doctors (minus removed ones) with overrides applied, then the clinic's own added specialists. */
export function mergeActiveDoctors(
  defaults: Doctor[],
  overrides: Record<string, DoctorOverride>,
  customDoctors: Doctor[],
  todayKey: string,
): Doctor[] {
  const builtIn = defaults
    .filter((doc) => !overrides[doc.id]?.deactivated)
    .map((doc) => applyDoctorOverride(doc, overrides[doc.id], todayKey));
  const builtInIds = new Set(defaults.map((d) => d.id));
  const custom = customDoctors
    .filter((doc) => !builtInIds.has(doc.id) && !overrides[doc.id]?.deactivated)
    .map((doc) => applyDoctorOverride(doc, overrides[doc.id], todayKey));
  return [...builtIn, ...custom];
}

/** Clean a schedule coming from the admin form: valid days and HH:MM times, start before end, no duplicates. */
export function sanitizeOpd(input: unknown): OpdSession[] | null {
  if (!Array.isArray(input)) return null;
  const seen = new Set<string>();
  const out: OpdSession[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const s = raw as Record<string, unknown>;
    const day = Number(s.day);
    const start = String(s.start ?? "");
    const end = String(s.end ?? "");
    if (!Number.isInteger(day) || day < 0 || day > 6) continue;
    if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end) || start >= end) continue;
    const recurrence =
      s.recurrence === "first-of-month" || s.recurrence === "alternate" ? s.recurrence : undefined;
    const key = `${day}-${start}-${end}-${recurrence ?? "weekly"}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ day: day as OpdSession["day"], start, end, ...(recurrence ? { recurrence } : {}) });
  }
  return out.sort((a, b) => a.day - b.day || a.start.localeCompare(b.start));
}

/** Weekday (0 = Sunday) of a YYYY-MM-DD date. */
function weekdayOf(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Booked, still-open appointments from today on that the new schedule or leave no longer covers. */
export function appointmentsOutsideSchedule<T extends BookedVisit>(
  appointments: T[],
  doctorId: string,
  opd: OpdSession[],
  leave: { onLeave: boolean; from?: string; until?: string },
  todayKey: string,
): T[] {
  return appointments.filter((a) => {
    if (a.doctorId !== doctorId || a.date < todayKey) return false;
    if (a.status === "cancelled" || a.status === "completed") return false;
    if (leave.onLeave && (!leave.from || a.date >= leave.from) && (!leave.until || a.date <= leave.until)) return true;
    if (opd.length === 0) return false; // by-appointment doctors: any day is fine
    const wd = weekdayOf(a.date);
    return !opd.some((s) => s.day === wd && a.time >= s.start && a.time < s.end);
  });
}

