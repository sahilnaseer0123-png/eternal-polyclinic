// schema.org data for search engines (JSON-LD). Built only from data/clinic.ts, so it can't drift
// from what the pages say. Google reads it to understand the clinic, its location and hours, and
// who practises there. Checked 23 Oct 2026: Google no longer shows FAQ rich results (dropped
// May 2026), so the FAQ page has no FAQPage markup on purpose.

import { clinic, doctors, services, type Doctor, type DoctorCategory } from "@/data/clinic";

const CLINIC_ID = `${clinic.siteUrl}/#clinic`;

/** schema.org MedicalSpecialty values for each speciality on the site. */
const SPECIALTY: Record<DoctorCategory, string[]> = {
  skin: ["Dermatology"],
  mind: ["Psychiatric"],
  general: ["PrimaryCare"],
  brain: ["Neurologic", "Surgical"],
};

/** In-house tests that are medical tests in schema.org terms. The pharmacy isn't one, so it's left out. */
const TESTS = new Set(["ultrasound", "echo", "lab"]);

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const doctorUrl = (d: Doctor) => `${clinic.siteUrl}/doctors/${d.id}`;

export function clinicSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "MedicalClinic",
    "@id": CLINIC_ID,
    name: clinic.name,
    url: clinic.siteUrl,
    logo: `${clinic.siteUrl}/icons/icon-512.png`,
    image: `${clinic.siteUrl}/opengraph-image.png`,
    telephone: clinic.phone,
    founder: { "@type": "Person", name: clinic.founder },
    address: {
      "@type": "PostalAddress",
      streetAddress: `${clinic.location.name} building, ${clinic.address.replace(/, Sopore$/, "")}`,
      addressLocality: "Sopore",
      addressRegion: "Jammu and Kashmir",
      addressCountry: "IN",
    },
    geo: { "@type": "GeoCoordinates", latitude: clinic.location.lat, longitude: clinic.location.lng },
    hasMap: clinic.mapUrl,
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: DAYS,
      opens: clinic.hours.open,
      closes: clinic.hours.close,
    },
    currenciesAccepted: "INR",
    priceRange: `₹${clinic.consultationFee} consultation`,
    medicalSpecialty: [...new Set(doctors.flatMap((d) => SPECIALTY[d.category]))],
    availableService: services
      .filter((s) => TESTS.has(s.id))
      .map((s) => ({ "@type": "MedicalTest", name: s.name, description: s.description })),
    potentialAction: {
      "@type": "ReserveAction",
      name: "Request an appointment",
      target: { "@type": "EntryPoint", urlTemplate: `${clinic.siteUrl}/book` },
    },
  };
}

/** One doctor, linked to the clinic. Null for a doctor whose name isn't confirmed yet. */
export function doctorSchema(d: Doctor) {
  if (!d.name) return null;
  return {
    "@context": "https://schema.org",
    "@type": "IndividualPhysician",
    "@id": `${doctorUrl(d)}#physician`,
    name: d.name,
    url: doctorUrl(d),
    description: `${d.speciality} (${d.degree}) at ${clinic.name}, Sopore.`,
    medicalSpecialty: SPECIALTY[d.category],
    knowsAbout: d.concerns,
    practicesAt: { "@id": CLINIC_ID },
    telephone: clinic.phone,
  };
}

/** Home > Doctors > this doctor. */
export function doctorBreadcrumbs(d: Doctor) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: clinic.siteUrl },
      { "@type": "ListItem", position: 2, name: "Doctors", item: `${clinic.siteUrl}/doctors` },
      { "@type": "ListItem", position: 3, name: d.name ?? d.speciality, item: doctorUrl(d) },
    ],
  };
}

/** For a <script type="application/ld+json">: "<" escaped so the data can never close the tag. */
export const jsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
