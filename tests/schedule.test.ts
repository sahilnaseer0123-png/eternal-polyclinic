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
  opdShort,
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
const physician = byId("physician");
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
  assert.deepEqual(ids("2026-10-23T10:00:00+05:30"), []);
  assert.deepEqual(ids("2026-10-24T10:00:00+05:30"), ["akash"]);
  assert.deepEqual(ids("2026-10-25T10:00:00+05:30"), ["mubashir"]);
  const next = nextSpecialist(doctors, at("2026-10-23T10:00:00+05:30"))!;
  assert.equal(next.doctor.id, "akash");
  assert.equal(next.daysAhead, 1);
});

test("next OPD dates follow each doctor's days", () => {
  const dates = (doc = akash, iso = "2026-10-23T10:00:00+05:30") => nextOpdDates(doc, at(iso)).map((d) => d.date);
  assert.deepEqual(dates(), ["2026-10-24", "2026-10-28", "2026-10-31", "2026-11-04"]);
  assert.equal(dates(akash, "2026-10-24T19:50:00+05:30")[0], "2026-10-28"); // last slot gone
  assert.equal(dates(akash, "2026-10-24T19:30:00+05:30")[0], "2026-10-24"); // 7:40 pm still open
  assert.deepEqual(dates(physician), []);
});

test("time slots", () => {
  const all = timeSlots(akash, "2026-10-28", at("2026-10-23T10:00:00+05:30"));
  assert.equal(all.length, 12);
  assert.equal(all[0], "16:00");
  assert.equal(all.at(-1), "19:40");
  assert.equal(timeSlots(mubashir, "2026-10-25", at("2026-10-23T10:00:00+05:30")).length, 15);
  assert.equal(timeSlots(akash, "2026-10-24", at("2026-10-24T17:05:00+05:30"))[0], "17:20");
  assert.deepEqual(timeSlots(akash, "2026-10-25", at("2026-10-23T10:00:00+05:30")), []);
});

test("display helpers", () => {
  assert.equal(formatTime("16:20"), "4:20 pm");
  assert.equal(formatTime("12:40"), "12:40 pm");
  assert.equal(opdSummary(akash), "Wednesday and Saturday, 4:00 pm – 8:00 pm");
  assert.equal(opdSummary(physician), null);
  const s = akash.opd[1];
  assert.equal(sessionStatus(s, at("2026-10-24T15:00:00+05:30")), "upcoming");
  assert.equal(sessionStatus(s, at("2026-10-24T17:00:00+05:30")), "in");
  assert.equal(sessionStatus(s, at("2026-10-24T20:00:00+05:30")), "done");
  const hours = { open: "07:00", close: "20:00" };
  assert.equal(isOpenNow(hours, at("2026-10-23T06:59:00+05:30")), false);
  assert.equal(isOpenNow(hours, at("2026-10-23T07:00:00+05:30")), true);
  assert.equal(isOpenNow(hours, at("2026-10-23T20:00:00+05:30")), false);
});

test("opdShort gives a compact line for cards", () => {
  const byId = (id: string) => doctors.find((d) => d.id === id)!;
  assert.equal(opdShort(byId("mubashir")), "Sun · 8 am–1 pm");
  assert.equal(opdShort(byId("akash")), "Wed, Sat · 4 pm–8 pm");
  assert.equal(opdShort(byId("physician")), null);
});

test("late in a sitting no slots are left today, so the home card offers the next visit", () => {
  const akash = doctors.find((d) => d.id === "akash")!;
  const wed745pm = new Date("2026-10-28T19:45:00+05:30"); // a Wednesday, last slot (7:40 pm) has passed
  assert.deepEqual(timeSlots(akash, "2026-10-28", wed745pm), []);
  assert.equal(nextOpdDates(akash, wed745pm, 1)[0].date, "2026-10-31"); // Saturday
});
