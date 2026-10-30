import { test } from "node:test";
import assert from "node:assert/strict";
import {
  generateToken,
  confirmationTicketText,
  doctorDelayBroadcastText,
  exportToCsv,
  formatDailyOwnerSummary,
  type Appointment,
  type DoctorLiveStatus,
} from "@/lib/appointments";

test("token generator formats date and doctor prefix correctly", () => {
  const token = generateToken("2026-10-31", "akash", false);
  assert.ok(token.startsWith("EP-AK1031-"), `Token was ${token}`);
  assert.equal(token.endsWith("-W"), false);

  const walkInToken = generateToken("2026-10-31", "akash", true);
  assert.ok(walkInToken.endsWith("-W"), `Walk-in token was ${walkInToken}`);
});

test("confirmationTicketText includes critical details, village address and helpline", () => {
  const apt: Appointment = {
    token: "EP-AK1031-01",
    doctorId: "akash",
    doctorName: "Dr. Akash Bashir",
    speciality: "Dermatologist & Cosmetologist",
    date: "2026-10-31",
    time: "15:30",
    patientName: "Tariq Ahmad",
    patientPhone: "9876543210",
    patientAddress: "Tarzoo, Sopore",
    type: "online",
    status: "confirmed",
    createdAt: 1729000000000,
  };

  const text = confirmationTicketText(apt);
  assert.ok(text.includes("EP-AK1031-01"));
  assert.ok(text.includes("Dr. Akash Bashir"));
  assert.ok(text.includes("Tariq Ahmad"));
  assert.ok(text.includes("Tarzoo, Sopore"));
  assert.ok(text.includes("97977 96909"));
  assert.ok(text.includes("Lone Complex"));
});

test("doctorDelayBroadcastText formats delayed announcement correctly", () => {
  const status: DoctorLiveStatus = {
    state: "delayed",
    delayMinutes: 45,
    note: "Highway traffic near Sangrama",
  };

  const broadcast = doctorDelayBroadcastText("Dr. Akash Bashir", status, "Saturday, 31 Oct");
  assert.ok(broadcast.includes("OPD DELAY NOTICE"));
  assert.ok(broadcast.includes("Dr. Akash Bashir"));
  assert.ok(broadcast.includes("45 minutes"));
  assert.ok(broadcast.includes("Highway traffic near Sangrama"));
  assert.ok(broadcast.includes("97977 96909"));
});

test("exportToCsv and formatDailyOwnerSummary generate expected formats for single and multiple doctors", () => {
  const csv = exportToCsv();
  assert.ok(csv.includes("Token No"));
  assert.ok(csv.includes("Village / Town"));

  // Default / All doctors consolidated report
  const summaryAll = formatDailyOwnerSummary("2026-10-31", "all");
  assert.ok(summaryAll.includes("ETERNAL POLYCLINIC — ALL DOCTORS OPD REPORT"));
  assert.ok(summaryAll.includes("Lone Complex, Opposite SDH, Sopore"));
  assert.ok(summaryAll.includes("Registration Channel"));

  // Doctor-specific report
  const summaryDoctor = formatDailyOwnerSummary("2026-10-31", "akash");
  assert.ok(summaryDoctor.includes("ETERNAL POLYCLINIC — OPD REPORT"));
  assert.ok(summaryDoctor.includes("97977 96909"));
});

