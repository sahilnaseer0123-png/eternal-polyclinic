// Run with: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { clinic, doctors } from "@/data/clinic";
import { faqs } from "@/data/faq";
import { formatTimeShort } from "@/lib/schedule";

test("short times drop :00 only", () => {
  assert.equal(formatTimeShort("16:00"), "4 pm");
  assert.equal(formatTimeShort("08:00"), "8 am");
  assert.equal(formatTimeShort("16:20"), "4:20 pm");
});

test("FAQ uses the real fee and phone, with no placeholders", () => {
  const all = faqs.map((f) => f.question + " " + f.answer).join("\n");
  assert.match(all, new RegExp(`₹${clinic.consultationFee}`));
  assert.match(all, new RegExp(clinic.phoneDisplay));
  assert.doesNotMatch(all, /\[[^\]]*\]|TODO|lorem/i);
});

test("no doctor shows a [Name] placeholder", () => {
  for (const d of doctors) assert.ok(d.name === null || !/\[/.test(d.name), d.id);
});

test("map points at coordinates, never a name search", () => {
  // Searching the clinic's name on Google Maps finds a different clinic.
  assert.doesNotMatch(clinic.mapUrl, /Eternal|search/i);
  assert.match(clinic.mapUrl, /destination=\d+\.\d+,\d+\.\d+/);
  assert.match(clinic.mapEmbedUrl, /q=\d+\.\d+,\d+\.\d+/);
});

test("address uses the hospital's real name, SDH", () => {
  assert.match(clinic.address, /SDH/);
  assert.doesNotMatch(clinic.address, /SHD/);
});

test("calls and WhatsApp use the clinic's two different numbers", () => {
  assert.equal(clinic.phone, "+919797796909");
  assert.equal(clinic.whatsapp, "919419055528");
  assert.equal(clinic.phoneDisplay.replace(/\s/g, ""), clinic.phone.slice(3));
  assert.equal(clinic.whatsappDisplay.replace(/\s/g, ""), clinic.whatsapp.slice(2));
});

test("map pin is the clinic's confirmed spot (Old Municipal Office)", () => {
  assert.equal(clinic.location.lat, 34.2938233);
  assert.equal(clinic.location.lng, 74.455089);
  assert.ok(clinic.mapUrl.includes(`${clinic.location.lat},${clinic.location.lng}`));
  assert.ok(clinic.mapEmbedUrl.includes(`${clinic.location.lat},${clinic.location.lng}`));
});
