// Brief item 6: changing a doctor's days or leave in Admin updates the public Specialists data,
// touches only that doctor, never duplicates sittings, and never moves booked appointments.

import assert from "node:assert/strict";
import { test } from "node:test";
import { doctors } from "@/data/clinic";
import {
  applyCloudMutation,
  buildActiveDoctorsFromState,
  buildPublicLivePayload,
  createMemoryKV,
  readClinicState,
  resolveStorageDriver,
  type CloudEnv,
} from "@/functions/_lib/clinic-store";
import { appointmentsOutsideSchedule, applyDoctorOverride, isLeaveActive, mergeActiveDoctors, sanitizeOpd } from "@/lib/doctor-overrides";
import { nextOpdDates, timeSlots } from "@/lib/schedule";
import { validateBooking } from "@/lib/booking";
import type { Appointment } from "@/lib/appointments";

const withOpd = doctors.filter((d) => d.opd.length > 0);
const [docA, docB] = withOpd;

test("leave runs only between its dates and ends by itself", () => {
  const ov = { onLeave: true, leaveFrom: "2026-11-10", leaveUntil: "2026-11-12" };
  assert.equal(isLeaveActive(ov, "2026-11-09"), false);
  assert.equal(isLeaveActive(ov, "2026-11-10"), true);
  assert.equal(isLeaveActive(ov, "2026-11-12"), true);
  assert.equal(isLeaveActive(ov, "2026-11-13"), false, "no stale 'On Leave' after the end date");
  assert.equal(applyDoctorOverride(docA, ov, "2026-11-11").availability, "On Leave until 12 Nov");
  assert.notEqual(applyDoctorOverride(docA, ov, "2026-11-13").availability?.startsWith("On Leave"), true);
  assert.equal(isLeaveActive({ onLeave: true }, "2030-01-01"), true, "open-ended leave until staff end it");
});

test("new sitting days replace the old ones for that doctor only, without duplicates", async () => {
  const env: CloudEnv = { EP_KV: createMemoryKV() };
  const driver = resolveStorageDriver(env)!;
  const newOpd = [
    { day: 2, start: "15:00", end: "17:00" },
    { day: 2, start: "15:00", end: "17:00" }, // duplicate row from the form
    { day: 5, start: "10:00", end: "09:00" }, // invalid (end before start)
  ];
  const state = await applyCloudMutation(driver, { op: "set_doctor_override", doctorId: docA.id, override: { customOpd: newOpd as never } });
  const active = buildActiveDoctorsFromState(state);
  const a = active.find((d) => d.id === docA.id)!;
  assert.deepEqual(a.opd, [{ day: 2, start: "15:00", end: "17:00" }]);
  const b = active.find((d) => d.id === docB.id)!;
  assert.deepEqual(b.opd, docB.opd, "other doctors untouched");
  assert.equal(a.name, docA.name, "unrelated details untouched");

  // The public payload the Specialists section reads carries the change
  const pub = buildPublicLivePayload(state);
  assert.deepEqual(pub.overrides[docA.id].customOpd, [{ day: 2, start: "15:00", end: "17:00" }]);

  // Changing it again replaces, never appends
  const state2 = await applyCloudMutation(driver, { op: "set_doctor_override", doctorId: docA.id, override: { customOpd: [{ day: 4, start: "11:00", end: "13:00" }] } });
  assert.deepEqual(buildActiveDoctorsFromState(state2).find((d) => d.id === docA.id)!.opd, [{ day: 4, start: "11:00", end: "13:00" }]);

  // null = back to the standard schedule
  const state3 = await applyCloudMutation(driver, { op: "set_doctor_override", doctorId: docA.id, override: { customOpd: null } });
  assert.deepEqual(buildActiveDoctorsFromState(state3).find((d) => d.id === docA.id)!.opd, docA.opd);
});

test("browser and server agree on the merged doctor list", () => {
  const overrides = { [docA.id]: { customOpd: [{ day: 3 as const, start: "10:00", end: "12:00" }] }, [docB.id]: { onLeave: true } };
  const merged = mergeActiveDoctors(doctors, overrides, [], "2026-11-04");
  assert.deepEqual(merged.find((d) => d.id === docA.id)!.opd, [{ day: 3, start: "10:00", end: "12:00" }]);
  assert.ok(merged.find((d) => d.id === docB.id)!.availability?.startsWith("On Leave"));
  assert.equal(merged.length, doctors.length);
});

test("booked appointments are never changed; ones that no longer fit are listed for rescheduling", async () => {
  const env: CloudEnv = { EP_KV: createMemoryKV() };
  const driver = resolveStorageDriver(env)!;
  const now = new Date();
  const { date } = nextOpdDates(docA, now, 1)[0];
  const time = timeSlots(docA, date, now)[0];
  const apt: Appointment = {
    token: "EP-KEEP-01", doctorId: docA.id, doctorName: docA.name ?? docA.speciality, speciality: docA.speciality,
    date, time, patientName: "Keep Me", patientPhone: "9876543210", type: "online", status: "confirmed", createdAt: Date.now(),
  };
  await applyCloudMutation(driver, { op: "upsert_appointment", appointment: apt });

  // Move the doctor to a different weekday than the booked one
  const otherDay = ((new Date(`${date}T00:00:00Z`).getUTCDay() + 1) % 7) as 0;
  const newOpd = [{ day: otherDay, start: "10:00", end: "12:00" }];
  const state = await applyCloudMutation(driver, { op: "set_doctor_override", doctorId: docA.id, override: { customOpd: newOpd } });
  const kept = (await readClinicState(driver)).appointments.find((a) => a.token === apt.token)!;
  assert.deepEqual(kept, apt, "the booking is exactly as it was");

  const affected = appointmentsOutsideSchedule(state.appointments, docA.id, newOpd, { onLeave: false }, date);
  assert.deepEqual(affected.map((a) => a.token), ["EP-KEEP-01"]);
  assert.deepEqual(appointmentsOutsideSchedule(state.appointments, docB.id, newOpd, { onLeave: false }, date), []);

  // New online bookings follow the new schedule
  const active = buildActiveDoctorsFromState(state);
  const oldDay = validateBooking({ doctorId: docA.id, date, time, name: "New Person", phone: "9876500000" }, active, now);
  assert.equal(oldDay.ok, false, "old day no longer bookable");
  const fresh = nextOpdDates(active.find((d) => d.id === docA.id)!, now, 1)[0];
  assert.equal(new Date(`${fresh.date}T00:00:00Z`).getUTCDay(), otherDay);
});

test("sanitizeOpd drops bad rows and sorts", () => {
  assert.deepEqual(sanitizeOpd([{ day: 9, start: "10:00", end: "11:00" }, { day: 1, start: "aa", end: "11:00" }, { day: 3, start: "09:00", end: "10:00" }, { day: 1, start: "16:00", end: "18:00" }]), [
    { day: 1, start: "16:00", end: "18:00" },
    { day: 3, start: "09:00", end: "10:00" },
  ]);
  assert.equal(sanitizeOpd("nope"), null);
});
