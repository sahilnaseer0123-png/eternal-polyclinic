"use client";

// Edit one doctor's sitting days and leave dates. Saves an override for THIS doctor only
// (set_doctor_override), which the public Specialists section, doctor pages and booking form all read.
// Never changes booked appointments: any booked visit that no longer fits is listed for reception to reschedule by hand.

import { useMemo, useState } from "react";
import type { Doctor, OpdSession, Weekday } from "@/data/clinic";
import { doctors as builtInDoctors } from "@/data/clinic";
import { setDoctorOverride, getDoctorOverrides, type Appointment } from "@/lib/appointments";
import { appointmentsOutsideSchedule, sanitizeOpd } from "@/lib/doctor-overrides";
import { DAY_NAMES, clinicClock, dateLabel, formatTime } from "@/lib/schedule";
import { Modal, Notice, fieldInput, fieldLabel, primaryBtn, secondaryBtn, smallBtn } from "./ui";

type Row = { day: Weekday; start: string; end: string; recurrence?: OpdSession["recurrence"] };

export function DoctorScheduleEditor({
  doctor,
  appointments,
  onClose,
  onSaved,
}: {
  doctor: Doctor;
  appointments: Appointment[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const override = getDoctorOverrides()[doctor.id];
  const builtIn = builtInDoctors.find((d) => d.id === doctor.id);
  const todayKey = clinicClock(new Date()).dateKey;

  const [rows, setRows] = useState<Row[]>(() => doctor.opd.map((s) => ({ ...s })));
  const [onLeave, setOnLeave] = useState<boolean>(Boolean(override?.onLeave));
  const [leaveFrom, setLeaveFrom] = useState<string>(override?.leaveFrom ?? "");
  const [leaveUntil, setLeaveUntil] = useState<string>(override?.leaveUntil ?? "");
  const [error, setError] = useState("");

  const cleaned = useMemo(() => sanitizeOpd(rows) ?? [], [rows]);
  const affected = useMemo(
    () =>
      appointmentsOutsideSchedule(
        appointments,
        doctor.id,
        cleaned,
        { onLeave, from: leaveFrom || undefined, until: leaveUntil || undefined },
        todayKey,
      ),
    [appointments, doctor.id, cleaned, onLeave, leaveFrom, leaveUntil, todayKey],
  );

  function update(i: number, patch: Partial<Row>) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  function save() {
    setError("");
    for (const r of rows) {
      if (!r.start || !r.end || r.start >= r.end) {
        setError(`Check the times for ${DAY_NAMES[r.day]}: the end time must be after the start time.`);
        return;
      }
    }
    if (leaveFrom && leaveUntil && leaveFrom > leaveUntil) {
      setError("Leave 'until' date must be on or after the 'from' date.");
      return;
    }
    if (rows.length !== cleaned.length) {
      setError("Two rows have the same day and time. Remove the duplicate.");
      return;
    }
    setDoctorOverride(doctor.id, {
      customOpd: cleaned,
      onLeave,
      leaveFrom: onLeave ? leaveFrom || null : null,
      leaveUntil: onLeave ? leaveUntil || null : null,
    });
    onSaved(`${doctor.name ?? doctor.speciality}: schedule saved. The public site shows it within a minute.`);
  }

  function resetToDefault() {
    if (!builtIn) return;
    setDoctorOverride(doctor.id, { customOpd: null, onLeave: false, leaveFrom: null, leaveUntil: null });
    onSaved(`${doctor.name ?? doctor.speciality}: back to the standard schedule.`);
  }

  return (
    <Modal title={`Schedule · ${doctor.name ?? doctor.speciality}`} onClose={onClose} wide>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <span className={fieldLabel}>Sitting days</span>
          {rows.length === 0 && (
            <p className="rounded-xl border border-line bg-ground px-3.5 py-2 text-sm text-muted">
              No fixed days: shown as &ldquo;By appointment&rdquo; on the site.
            </p>
          )}
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 rounded-2xl border border-line p-3 sm:grid-cols-[1.3fr_1fr_1fr_1.2fr_auto] sm:items-end">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted">Day</span>
                <select className={fieldInput} value={r.day} onChange={(e) => update(i, { day: Number(e.target.value) as Weekday })}>
                  {DAY_NAMES.map((n, d) => (
                    <option key={n} value={d}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted">From</span>
                <input type="time" className={fieldInput} value={r.start} onChange={(e) => update(i, { start: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted">To</span>
                <input type="time" className={fieldInput} value={r.end} onChange={(e) => update(i, { end: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted">Repeats</span>
                <select
                  className={fieldInput}
                  value={r.recurrence ?? "weekly"}
                  onChange={(e) =>
                    update(i, { recurrence: e.target.value === "weekly" ? undefined : (e.target.value as OpdSession["recurrence"]) })
                  }
                >
                  <option value="weekly">Every week</option>
                  <option value="alternate">Alternate weeks</option>
                  <option value="first-of-month">1st of month</option>
                </select>
              </label>
              <button type="button" className={`${smallBtn} col-span-2 sm:col-span-1`} onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}>
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className={`${secondaryBtn} self-start`}
            onClick={() => setRows((rs) => [...rs, { day: 1, start: "10:00", end: "14:00" }])}
          >
            + Add a sitting day
          </button>
        </div>

        <div className="flex flex-col gap-2 rounded-2xl border border-line p-4">
          <label className="flex min-h-11 items-center gap-3 text-base font-semibold text-ink">
            <input type="checkbox" className="size-5 accent-[var(--color-brand)]" checked={onLeave} onChange={(e) => setOnLeave(e.target.checked)} />
            On leave
          </label>
          {onLeave && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted">From (blank = now)</span>
                <input type="date" className={fieldInput} value={leaveFrom} min={todayKey} onChange={(e) => setLeaveFrom(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted">Until (blank = until you end it)</span>
                <input type="date" className={fieldInput} value={leaveUntil} min={leaveFrom || todayKey} onChange={(e) => setLeaveUntil(e.target.value)} />
              </label>
            </div>
          )}
          <p className="text-xs text-muted">Leave ends by itself after the &lsquo;until&rsquo; date.</p>
        </div>

        {affected.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-bold">
              {affected.length} booked appointment{affected.length > 1 ? "s" : ""} no longer fit this schedule.
            </p>
            <p className="mt-1">They stay booked. Call these patients to reschedule them in Appointments:</p>
            <ul className="mt-2 flex flex-col gap-1">
              {affected.slice(0, 8).map((a) => (
                <li key={a.token} className="tabular-nums">
                  {a.token} · {a.patientName} · {dateLabel(a.date)} {formatTime(a.time)}
                </li>
              ))}
              {affected.length > 8 && <li>…and {affected.length - 8} more</li>}
            </ul>
          </div>
        )}

        {error && <Notice tone="error">{error}</Notice>}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          {builtIn ? (
            <button type="button" className={smallBtn} onClick={resetToDefault}>
              Reset to standard schedule
            </button>
          ) : (
            <span />
          )}
          <button type="button" className={primaryBtn} onClick={save}>
            Save schedule
          </button>
        </div>
      </div>
    </Modal>
  );
}
