// Patient statistics and the owner's daily figures, always computed from database records (never hard-coded).

import type { OwnerSummaryStats } from "../../lib/messages";
import { clinicDateKey, type SqlDatabase } from "./db";

function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/** Monday of the week containing dateKey. */
function weekStart(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return addDays(dateKey, -((wd + 6) % 7));
}

type DayCount = { day: string; n: number };

async function perDay(db: SqlDatabase, sql: string, from: string, to: string): Promise<Map<string, number>> {
  const { results } = await db.prepare(sql).bind(from, to).all<DayCount>();
  return new Map(results.map((r) => [r.day, r.n]));
}

export type SeriesPoint = { label: string; start: string; registrations: number; appointments: number; reports: number };

export async function patientStatistics(db: SqlDatabase, today: string = clinicDateKey()) {
  const one = async (sql: string, ...b: unknown[]) => (await db.prepare(sql).bind(...b).first<{ n: number }>())?.n ?? 0;

  const totals = {
    totalPatients: await one("SELECT COUNT(*) AS n FROM patients"),
    totalAppointments: await one("SELECT COUNT(*) AS n FROM appointments WHERE deleted_at IS NULL AND status != 'cancelled'"),
    totalReports: await one("SELECT COUNT(*) AS n FROM lab_reports"),
    pendingReports: await one("SELECT COUNT(*) AS n FROM lab_reports WHERE status IN ('pending','processing')"),
    completedReports: await one("SELECT COUNT(*) AS n FROM lab_reports WHERE status = 'ready'"),
    deliveredReports: await one("SELECT COUNT(*) AS n FROM lab_reports WHERE delivery_status IN ('delivered','read')"),
    failedReports: await one("SELECT COUNT(*) AS n FROM lab_reports WHERE delivery_status = 'failed'"),
    todayRegistrations: await one("SELECT COUNT(*) AS n FROM patients WHERE created_date = ?1", today),
    todayAppointments: await one("SELECT COUNT(*) AS n FROM appointments WHERE date = ?1 AND deleted_at IS NULL AND status != 'cancelled'", today),
    failedMessages: await one("SELECT COUNT(*) AS n FROM notifications WHERE status = 'failed'"),
  };

  // One pass over the last ~13 months, grouped by day; weeks and months are built from the days.
  const from = addDays(today, -400);
  const regs = await perDay(db, "SELECT created_date AS day, COUNT(*) AS n FROM patients WHERE created_date BETWEEN ?1 AND ?2 GROUP BY created_date", from, today);
  const appts = await perDay(
    db,
    "SELECT date AS day, COUNT(*) AS n FROM appointments WHERE date BETWEEN ?1 AND ?2 AND deleted_at IS NULL AND status != 'cancelled' GROUP BY date",
    from,
    today,
  );
  const reps = await perDay(db, "SELECT created_date AS day, COUNT(*) AS n FROM lab_reports WHERE created_date BETWEEN ?1 AND ?2 GROUP BY created_date", from, today);

  const sumRange = (m: Map<string, number>, start: string, end: string) => {
    let n = 0;
    for (const [k, v] of m) if (k >= start && k <= end) n += v;
    return n;
  };
  const point = (label: string, start: string, end: string): SeriesPoint => ({
    label,
    start,
    registrations: sumRange(regs, start, end),
    appointments: sumRange(appts, start, end),
    reports: sumRange(reps, start, end),
  });

  const daily: SeriesPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = addDays(today, -i);
    daily.push(point(d.slice(5), d, d));
  }
  const weekly: SeriesPoint[] = [];
  const thisWeek = weekStart(today);
  for (let i = 11; i >= 0; i--) {
    const s = addDays(thisWeek, -7 * i);
    weekly.push(point(`w/c ${s.slice(5)}`, s, addDays(s, 6)));
  }
  const monthly: SeriesPoint[] = [];
  const [ty, tm] = today.split("-").map(Number);
  for (let i = 11; i >= 0; i--) {
    const dt = new Date(Date.UTC(ty, tm - 1 - i, 1));
    const s = dt.toISOString().slice(0, 10);
    const e = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
    monthly.push(point(s.slice(0, 7), s, e));
  }

  return { today, totals, daily, weekly, monthly };
}

/** Figures for one clinic date, for the owner's WhatsApp summary. */
export async function ownerDayStats(db: SqlDatabase, date: string): Promise<OwnerSummaryStats> {
  // That clinic day in milliseconds (IST is UTC+5:30, no daylight saving).
  const [y, m, d] = date.split("-").map(Number);
  const dayStart = Date.UTC(y, m - 1, d) - 330 * 60 * 1000;
  const dayEnd = dayStart + 86_400_000;
  const one = async (sql: string, ...b: unknown[]) => (await db.prepare(sql).bind(...b).first<{ n: number }>())?.n ?? 0;
  const live = "a.date = ?1 AND a.deleted_at IS NULL AND a.status != 'cancelled'";
  const { results: doctors } = await db
    .prepare(
      `SELECT a.doctor_name AS name, COUNT(*) AS booked, SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) AS done
       FROM appointments a WHERE ${live} GROUP BY a.doctor_id ORDER BY booked DESC`,
    )
    .bind(date)
    .all<{ name: string; booked: number; done: number }>();

  return {
    date,
    totalPatients: await one(`SELECT COUNT(DISTINCT a.patient_id) AS n FROM appointments a WHERE ${live}`, date),
    newRegistrations: await one("SELECT COUNT(*) AS n FROM patients WHERE created_date = ?1", date),
    appointmentsBooked: await one(`SELECT COUNT(*) AS n FROM appointments a WHERE ${live}`, date),
    completedAppointments: await one(`SELECT COUNT(*) AS n FROM appointments a WHERE ${live} AND a.status = 'completed'`, date),
    pendingAppointments: await one(`SELECT COUNT(*) AS n FROM appointments a WHERE ${live} AND a.status != 'completed'`, date),
    cancelledAppointments: await one("SELECT COUNT(*) AS n FROM appointments a WHERE a.date = ?1 AND a.deleted_at IS NULL AND a.status = 'cancelled'", date),
    walkIns: await one(`SELECT COUNT(*) AS n FROM appointments a WHERE ${live} AND a.type = 'walk_in'`, date),
    online: await one(`SELECT COUNT(*) AS n FROM appointments a WHERE ${live} AND a.type = 'online'`, date),
    reportsUploaded: await one("SELECT COUNT(*) AS n FROM lab_reports WHERE uploaded_at >= ?1 AND uploaded_at < ?2", dayStart, dayEnd),
    // Still waiting at the end of that day: registered on or before it and not released by then
    reportsPending: await one(
      "SELECT COUNT(*) AS n FROM lab_reports WHERE created_at < ?1 AND (ready_at IS NULL OR ready_at >= ?1)",
      dayEnd,
    ),
    reportsDelivered: await one(
      "SELECT COUNT(DISTINCT ref_id) AS n FROM notifications WHERE kind = 'lab_report' AND COALESCE(delivered_at, read_at) >= ?1 AND COALESCE(delivered_at, read_at) < ?2",
      dayStart,
      dayEnd,
    ),
    failedDeliveries: await one(
      "SELECT COUNT(DISTINCT ref_id) AS n FROM notifications WHERE kind = 'lab_report' AND status = 'failed' AND failed_at >= ?1 AND failed_at < ?2",
      dayStart,
      dayEnd,
    ),
    doctors: doctors.map((d) => ({ name: d.name, booked: d.booked, done: d.done ?? 0 })),
  };
}
