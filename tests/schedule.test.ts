// Run with: npm test
// Instants are written with +05:30 so they read as India time.

import { test } from "node:test";
import assert from "node:assert/strict";
import { doctors } from "@/data/clinic";
import {
  clinicClock,
  dateLabel,
  doctorsInToday,
  formatTime,
  isOpenNow,
  nextSlot,
  opdShort,
  slotLabel,
  nextOpdDates,
  nextSpecialist,
  opdSummary,
  sessionStatus,
  timeSlots,
  weekdayOf,
} from "@/lib/schedule";

const byId = (id: string) => doctors.find((d) => d.id === id)!;
const akash = byId("akash");
const mubashir = byId("mubashir");
const hanief = byId("hanief");
const at = (iso: string) => new Date(iso);

test("weekdays and labels", () => {
  assert.equal(weekdayOf("2026-10-23"), 5);
  assert.equal(weekdayOf("2026-10-25"), 0);
  assert.equal(dateLabel("2026-10-24"), "Saturday, 24 October");
});

test("clinic clock uses India time, not the server's", () => {
  // 1:30 am Saturday in India is still Friday evening in UTC
  const c = clinicClock(at("2026-10-24T01:30:00+05:30"));
  assert.equal(c.dateKey, "2026-10-24");
  assert.equal(c.weekday, 6);
  assert.equal(c.minutes, 90);
});

test("who's in today and who's next", () => {
  const ids = (iso: string) => doctorsInToday(doctors, at(iso)).map((x) => x.doctor.id);
  assert.deepEqual(ids("2026-10-23T10:00:00+05:30"), ["audil", "hilal"]);
  assert.deepEqual(ids("2026-10-24T10:00:00+05:30"), ["akash"]);
  assert.ok(ids("2026-10-25T11:00:00+05:30").includes("mubashir"));
  assert.ok(ids("2026-10-25T11:00:00+05:30").includes("suhail"));
  const next = nextSpecialist(doctors, at("2026-10-23T14:00:00+05:30"))!;
  assert.equal(next.doctor.id, "akash");
  assert.equal(next.daysAhead, 1);
});

test("next OPD dates follow each doctor's days", () => {
  const dates = (doc = akash, iso = "2026-10-23T10:00:00+05:30") => nextOpdDates(doc, at(iso)).map((d) => d.date);
  assert.deepEqual(dates(), ["2026-10-24", "2026-10-29", "2026-10-31", "2026-11-05"]);
  assert.equal(dates(akash, "2026-10-24T16:50:00+05:30")[0], "2026-10-29"); // last slot on Sat (4:40 pm) passed
  assert.equal(dates(akash, "2026-10-24T16:30:00+05:30")[0], "2026-10-24"); // 4:40 pm slot still open
  assert.deepEqual(dates(hanief), []);
});

test("time slots", () => {
  const satSlots = timeSlots(akash, "2026-10-24", at("2026-10-23T10:00:00+05:30"));
  assert.equal(satSlots.length, 24); // 9 am to 5 pm = 8 hrs * 3 = 24 slots
  assert.equal(satSlots[0], "09:00");
  assert.equal(satSlots.at(-1), "16:40");
  assert.equal(timeSlots(mubashir, "2026-10-25", at("2026-10-23T10:00:00+05:30")).length, 10);
  assert.equal(timeSlots(akash, "2026-10-24", at("2026-10-24T09:15:00+05:30"))[0], "09:20");
  assert.deepEqual(timeSlots(akash, "2026-10-25", at("2026-10-23T10:00:00+05:30")), []);
});

test("display helpers", () => {
  assert.equal(formatTime("16:20"), "4:20 pm");
  assert.equal(formatTime("12:40"), "12:40 pm");
  assert.equal(opdSummary(akash), "Thursday, 9:00 am – 2:00 pm; Saturday, 9:00 am – 5:00 pm");
  assert.equal(opdSummary(hanief), null);
  const s = akash.opd[1];
  assert.equal(sessionStatus(s, at("2026-10-24T08:00:00+05:30")), "upcoming");
  assert.equal(sessionStatus(s, at("2026-10-24T12:00:00+05:30")), "in");
  assert.equal(sessionStatus(s, at("2026-10-24T17:00:00+05:30")), "done");
  const hours = { open: "07:00", close: "20:00" };
  assert.equal(isOpenNow(hours, at("2026-10-23T06:59:00+05:30")), false);
  assert.equal(isOpenNow(hours, at("2026-10-23T07:00:00+05:30")), true);
  assert.equal(isOpenNow(hours, at("2026-10-23T20:00:00+05:30")), false);
});

test("opdShort gives a compact line for cards", () => {
  const byId = (id: string) => doctors.find((d) => d.id === id)!;
  assert.equal(opdShort(byId("mubashir")), "Sun · 10:30 am–2 pm");
  assert.equal(opdShort(byId("akash")), "Thu · 9 am–2 pm · Sat · 9 am–5 pm");
  assert.equal(opdShort(byId("hanief")), null);
});

test("late in a sitting no slots are left today, so the home card offers the next visit", () => {
  const akash = doctors.find((d) => d.id === "akash")!;
  const sat450pm = new Date("2026-10-24T16:50:00+05:30"); // a Saturday, last slot (4:40 pm) has passed
  assert.deepEqual(timeSlots(akash, "2026-10-24", sat450pm), []);
  assert.equal(nextOpdDates(akash, sat450pm, 1)[0].date, "2026-10-29"); // Thursday
});

test("nextSlot and slotLabel: the next free slot in patient words", () => {
  const akash = doctors.find((d) => d.id === "akash")!;
  const fri = new Date("2026-10-23T11:00:00+05:30"); // Friday morning
  const slot = nextSlot(akash, fri)!;
  assert.deepEqual(slot, { date: "2026-10-24", time: "09:00" });
  assert.equal(slotLabel(slot, fri), "Tomorrow, 9:00 am");
  const sat915 = new Date("2026-10-24T09:15:00+05:30"); // during Saturday's sitting
  assert.equal(slotLabel(nextSlot(akash, sat915)!, sat915), "Today, 9:20 am");
  const sun = new Date("2026-10-25T10:00:00+05:30");
  assert.equal(slotLabel(nextSlot(akash, sun)!, sun), "Thu 29 Oct, 9:00 am");
  assert.equal(nextSlot(doctors.find((d) => d.id === "hanief")!, fri), null);
});

test("every doctor lists common reasons to visit", () => {
  for (const d of doctors) assert.ok(d.concerns.length >= 3, d.id);
});

test("slotLabel short form fits small cards", () => {
  const fri = new Date("2026-10-23T11:00:00+05:30");
  assert.equal(slotLabel({ date: "2026-10-24", time: "16:00" }, fri, true), "Tomorrow, 4 pm");
  assert.equal(slotLabel({ date: "2026-10-25", time: "08:00" }, fri, true), "Sun, 8 am");
  assert.equal(slotLabel({ date: "2026-11-01", time: "08:00" }, fri, true), "Sun 1 Nov, 8 am");
});
