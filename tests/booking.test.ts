// Run with: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { clinic, doctors } from "@/data/clinic";
import { bookingMessage, normalizePhone, validateBooking, whatsappLink, type BookingRequest } from "@/lib/booking";

const friday = new Date("2026-10-23T10:00:00+05:30");
const good: BookingRequest = { doctorId: "akash", date: "2026-10-24", time: "16:20", name: "Sahil", phone: "98765 43210" };

test("phone numbers are cleaned up", () => {
  assert.equal(normalizePhone("+91 98765-43210"), "9876543210");
  assert.equal(normalizePhone("098765 43210"), "9876543210");
  assert.equal(normalizePhone("919876543210"), "9876543210");
});

test("a valid request passes and the phone is normalised", () => {
  const r = validateBooking(good, doctors, friday);
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.data.phone, "9876543210");
});

test("empty form gives one message per field", () => {
  const r = validateBooking({ doctorId: "", date: "", time: "", name: "", phone: "" }, doctors, friday);
  assert.equal(r.ok, false);
  if (!r.ok) assert.deepEqual(Object.keys(r.errors).sort(), ["date", "doctorId", "name", "phone", "time"]);
});

test("bad phone numbers are rejected", () => {
  for (const phone of ["12345", "5876543210", "98765432101"]) {
    const r = validateBooking({ ...good, phone }, doctors, friday);
    assert.equal(r.ok, false, phone);
    if (!r.ok) assert.ok(r.errors.phone, phone);
  }
});

test("a day the doctor doesn't sit is rejected", () => {
  const r = validateBooking({ ...good, date: "2026-10-25" }, doctors, friday); // Sunday
  assert.equal(r.ok, false);
  if (!r.ok) assert.ok(r.errors.date);
});

test("a time outside OPD hours is rejected", () => {
  const r = validateBooking({ ...good, time: "18:00" }, doctors, friday);
  assert.equal(r.ok, false);
  if (!r.ok) assert.ok(r.errors.time);
});

test("a slot that has already passed today is rejected", () => {
  const sat430pm = new Date("2026-10-24T16:30:00+05:30");
  const r = validateBooking({ ...good, time: "16:20" }, doctors, sat430pm);
  assert.equal(r.ok, false);
  if (!r.ok) assert.ok(r.errors.time);
});

test("doctors without OPD days can't be booked online", () => {
  const r = validateBooking({ ...good, doctorId: "hanief" }, doctors, friday);
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.errors.doctorId ?? "", /call/i);
});

test("the WhatsApp message names the doctor, never the speciality", () => {
  const akash = doctors.find((d) => d.id === "akash")!;
  const msg = bookingMessage({ ...good, phone: "9876543210" }, akash, clinic.name);
  assert.match(msg, /Dr\. Akash/);
  assert.match(msg, /Saturday, 24 October/);
  assert.match(msg, /4:20 pm/);
  assert.doesNotMatch(msg, /psychiat|mental|mind/i);
  assert.ok(whatsappLink(clinic.whatsapp, msg).startsWith(`https://wa.me/${clinic.whatsapp}?text=`));
});
