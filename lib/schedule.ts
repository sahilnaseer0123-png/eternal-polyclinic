// Schedule logic: who is in today, a doctor's next OPD dates, and bookable time slots.
// Every function takes `now` as an argument, so it is easy to test with any date.
// All times are clinic time (Asia/Kolkata), whatever time zone the server or phone is in.

import type { Doctor, OpdSession, Weekday } from "@/data/clinic";

const CLINIC_TZ = "Asia/Kolkata";

export type ClinicClock = {
  /** "YYYY-MM-DD" in clinic time */
  dateKey: string;
  weekday: Weekday;
  /** Minutes since midnight in clinic time */
  minutes: number;
};

/** Reads the current date, weekday and time in clinic time. */
export function clinicClock(now: Date): ClinicClock {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: CLINIC_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  const dateKey = `${get("year")}-${get("month")}-${get("day")}`;
  return {
    dateKey,
    weekday: weekdayOf(dateKey),
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

/** "16:20" -> 980 */
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** 980 -> "16:20" */
export function fromMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "16:20" -> "4:20 pm" */
export function formatTime(hhmm: string): string {
  const total = toMinutes(hhmm);
  const h = Math.floor(total / 60);
  const m = total % 60;
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}

/** Weekday of a "YYYY-MM-DD" date (calendar maths in UTC, so no time zone can shift it). */
export function weekdayOf(dateKey: string): Weekday {
  const [y, mo, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d)).getUTCDay() as Weekday;
}

/** "2026-10-23" plus 3 days -> "2026-10-26" */
export function addDays(dateKey: string, days: number): string {
  const [y, mo, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d + days)).toISOString().slice(0, 10);
}

/** The doctor's OPD sitting on that weekday, if any. */
export function sessionOn(doctor: Doctor, day: Weekday): OpdSession | undefined {
  return doctor.opd.find((s) => s.day === day);
}

/** Doctors sitting today, with today's sitting. */
export function doctorsInToday(list: Doctor[], now: Date) {
  const { weekday } = clinicClock(now);
  return list.flatMap((doctor) => {
    const session = sessionOn(doctor, weekday);
    return session ? [{ doctor, session }] : [];
  });
}

/** The first specialist sitting after today, within the next 7 days. */
export function nextSpecialist(list: Doctor[], now: Date) {
  const { dateKey } = clinicClock(now);
  for (let i = 1; i <= 7; i++) {
    const date = addDays(dateKey, i);
    const day = weekdayOf(date);
    for (const doctor of list) {
      const session = sessionOn(doctor, day);
      if (session) return { doctor, session, date, daysAhead: i };
    }
  }
  return null;
}

/**
 * The doctor's next `count` bookable OPD dates.
 * Today counts only if at least one slot is still ahead.
 */
export function nextOpdDates(doctor: Doctor, now: Date, count = 4) {
  if (doctor.opd.length === 0) return [];
  const clock = clinicClock(now);
  const dates: { date: string; session: OpdSession }[] = [];
  for (let i = 0; i < 60 && dates.length < count; i++) {
    const date = addDays(clock.dateKey, i);
    const session = sessionOn(doctor, weekdayOf(date));
    if (!session) continue;
    if (i === 0 && timeSlots(doctor, date, now).length === 0) continue;
    dates.push({ date, session });
  }
  return dates;
}

/** Bookable start times ("HH:mm") for a doctor on a date. Past times today are left out. */
export function timeSlots(doctor: Doctor, date: string, now: Date): string[] {
  const session = sessionOn(doctor, weekdayOf(date));
  if (!session) return [];
  const clock = clinicClock(now);
  const start = toMinutes(session.start);
  const end = toMinutes(session.end);
  const slots: string[] = [];
  for (let m = start; m + doctor.slotMinutes <= end; m += doctor.slotMinutes) {
    if (date === clock.dateKey && m <= clock.minutes) continue;
    slots.push(fromMinutes(m));
  }
  return slots;
}

// ---------- Display helpers ----------

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

/** "2026-10-24" -> "Saturday, 24 October" */
export function dateLabel(dateKey: string): string {
  const [, mo, d] = dateKey.split("-").map(Number);
  return `${DAY_NAMES[weekdayOf(dateKey)]}, ${d} ${MONTH_NAMES[mo - 1]}`;
}

/** "Wednesday and Saturday, 4:00 pm – 8:00 pm", or null when OPD days aren't confirmed. */
export function opdSummary(doctor: Doctor): string | null {
  if (doctor.opd.length === 0) return null;
  const sameHours = doctor.opd.every((s) => s.start === doctor.opd[0].start && s.end === doctor.opd[0].end);
  if (sameHours) {
    const days = doctor.opd.map((s) => DAY_NAMES[s.day]);
    const dayText = days.length === 1 ? days[0] : `${days.slice(0, -1).join(", ")} and ${days.at(-1)}`;
    return `${dayText}, ${formatTime(doctor.opd[0].start)} – ${formatTime(doctor.opd[0].end)}`;
  }
  return doctor.opd
    .map((s) => `${DAY_NAMES[s.day]}, ${formatTime(s.start)} – ${formatTime(s.end)}`)
    .join("; ");
}

/** Where a sitting is right now: not started, in progress, or over for the day. */
export function sessionStatus(session: OpdSession, now: Date): "upcoming" | "in" | "done" {
  const { minutes } = clinicClock(now);
  if (minutes < toMinutes(session.start)) return "upcoming";
  if (minutes < toMinutes(session.end)) return "in";
  return "done";
}

/** Is the clinic open right now (clinic time)? */
export function isOpenNow(hours: { open: string; close: string }, now: Date): boolean {
  const { minutes } = clinicClock(now);
  return minutes >= toMinutes(hours.open) && minutes < toMinutes(hours.close);
}
