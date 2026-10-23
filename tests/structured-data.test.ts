import { test } from "node:test";
import assert from "node:assert/strict";
import { clinic, doctors } from "../data/clinic";
import { clinicSchema, doctorBreadcrumbs, doctorSchema, jsonLd } from "../lib/structured-data";

test("clinic schema carries location, hours and booking from clinic.ts", () => {
  const s = clinicSchema();
  assert.equal(s["@type"], "MedicalClinic");
  assert.equal(s.geo.latitude, clinic.location.lat);
  assert.equal(s.geo.longitude, clinic.location.lng);
  assert.equal(s.hasMap, clinic.mapUrl);
  assert.equal(s.openingHoursSpecification.opens, clinic.hours.open);
  assert.equal(s.openingHoursSpecification.closes, clinic.hours.close);
  assert.equal(s.openingHoursSpecification.dayOfWeek.length, 7);
  assert.equal(s.potentialAction.target.urlTemplate, `${clinic.siteUrl}/book`);
  assert.ok(s.medicalSpecialty.includes("Dermatology"));
  assert.ok(s.availableService.every((x) => x["@type"] === "MedicalTest"));
  assert.ok(!s.availableService.some((x) => /pharmacy/i.test(x.name)));
});

test("named doctors link to the clinic; unconfirmed doctors get no physician entry", () => {
  for (const d of doctors) {
    const s = doctorSchema(d);
    if (!d.name) {
      assert.equal(s, null);
      continue;
    }
    assert.ok(s);
    assert.equal(s.name, d.name);
    assert.equal(s.practicesAt["@id"], clinicSchema()["@id"]);
    assert.deepEqual(s.knowsAbout, d.concerns);
  }
});

test("breadcrumbs end at the doctor's page", () => {
  const d = doctors[0];
  const b = doctorBreadcrumbs(d);
  assert.equal(b.itemListElement.at(-1)?.item, `${clinic.siteUrl}/doctors/${d.id}`);
});

test("JSON-LD output can't close its script tag", () => {
  const out = jsonLd({ x: "</script><script>alert(1)</script>" });
  assert.ok(!out.includes("</script>"));
  assert.deepEqual(JSON.parse(out), { x: "</script><script>alert(1)</script>" });
});
